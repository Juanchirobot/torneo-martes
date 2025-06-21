const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-partido";

let jugadores = [];
let partidos = [];
let formaciones = [];
let chartJugadores = null;

async function cargarDatos() {
  try {
    const [jugRes, partRes, formRes] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Partidos?key=${API_KEY}`),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Formacion?key=${API_KEY}`)
    ]);

    const jugData = await jugRes.json();
    const partData = await partRes.json();
    const formData = await formRes.json();

    jugadores = jugData.values.slice(1).map(([fechaAlta, id, nombre, estado, tel]) => ({
      id: parseInt(id),
      nombre,
      estado,
      tel,
      fechaAlta
    }));

    partidos = partData.values.slice(1).map(row => ({
      torneo: row[0],
      fecha_inicio_torneo: row[1],
      fecha_partido: row[2],
      nombre_partido: row[3],
      jugador: row[4],
      id_jugador: parseInt(row[5]),
      equipo: row[6],
      goles: parseInt(row[7]) || 0,
      flag_figura: parseInt(row[8]) || 0,
      puntos: parseInt(row[9]) || 0
    }));

    formaciones = formData.values.slice(1).map(([fecha, nombrePartido, votante, figura, idFigura, tel, flag]) => ({
      fecha_partido: fecha,
      nombre_partido: nombrePartido,
      votante,
      figura_votada: figura,
      id_jugador_votado: parseInt(idFigura),
      flag_ausencia_voto: parseInt(flag || 0)
    }));
  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
}

function calcularPuntos() {
  const puntos = {};

  const partidosAgrupados = {};
  partidos.forEach(p => {
    const clave = `${p.fecha_partido}__${p.nombre_partido}`;
    if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
    partidosAgrupados[clave].push(p);
  });

  Object.entries(partidosAgrupados).forEach(([clave, jugadoresPartido]) => {
    const golesBlanco = jugadoresPartido
      .filter(j => j.equipo === "Blanco")
      .reduce((acc, j) => acc + j.goles, 0);
    const golesNegro = jugadoresPartido
      .filter(j => j.equipo === "Negro")
      .reduce((acc, j) => acc + j.goles, 0);

    const resultado = golesBlanco > golesNegro ? { Blanco: 3, Negro: 0 }
                    : golesNegro > golesBlanco ? { Blanco: 0, Negro: 3 }
                    : { Blanco: 1, Negro: 1 };

    const figuras = formaciones
      .filter(f => f.fecha_partido === jugadoresPartido[0].fecha_partido &&
                   f.nombre_partido === jugadoresPartido[0].nombre_partido)
      .map(f => f.id_jugador_votado);

    // identificar goleador si hay uno único
    const maxGoles = Math.max(...jugadoresPartido.map(j => j.goles));
    const goleadores = jugadoresPartido.filter(j => j.goles === maxGoles);
    const hayUnicoGoleador = goleadores.length === 1;
    const idUnicoGoleador = hayUnicoGoleador ? goleadores[0].id_jugador : null;

    jugadoresPartido.forEach(j => {
      if (!puntos[j.jugador]) {
        puntos[j.jugador] = { puntos: 0, goles: 0, partidos: 0, figura: 0 };
      }

      puntos[j.jugador].partidos += 1;
      puntos[j.jugador].goles += j.goles;
      puntos[j.jugador].puntos += resultado[j.equipo] || 0;

      if (figuras.includes(j.id_jugador)) {
        puntos[j.jugador].puntos += 1;
        puntos[j.jugador].figura += 1;
      }

      if (j.id_jugador === idUnicoGoleador) {
        puntos[j.jugador].puntos += 1;
      }
    });
  });

  return puntos;
}
function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach(p => {
    const clave = `${p.fecha_partido}__${p.nombre_partido}`;
    if (!agrupados[clave]) agrupados[clave] = [];
    agrupados[clave].push(p);
  });

  const ultimos = Object.entries(agrupados)
    .sort((a, b) => new Date(b[0].split("__")[0]) - new Date(a[0].split("__")[0]))
    .slice(0, 3);

  const cards = ultimos.map(([clave, jugadores]) => {
    let golesBlanco = 0, golesNegro = 0;
    let figura = "-", goleador = "-";

    const blanco = jugadores.filter(j => j.equipo === "Blanco");
    const negro = jugadores.filter(j => j.equipo === "Negro");

    golesBlanco = blanco.reduce((acc, j) => acc + j.goles, 0);
    golesNegro = negro.reduce((acc, j) => acc + j.goles, 0);

    const formacion = formaciones.find(f =>
      f.fecha_partido === jugadores[0].fecha_partido &&
      f.nombre_partido === jugadores[0].nombre_partido
    );
    figura = jugadores.find(j => j.id_jugador === formacion?.id_jugador_votado)?.jugador || "-";

    const maxGoles = Math.max(...jugadores.map(j => j.goles));
    const candidatos = jugadores.filter(j => j.goles === maxGoles);
    goleador = candidatos.length === 1 ? candidatos[0].jugador : "-";

    const [fecha, nombrePartido] = clave.split("__");
    return `
      <div class="cardPartidoCompacto">
        <strong>${fecha} - ${nombrePartido}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador}<br/>
        ⭐ Figura: ${figura}
      </div>
    `;
  });

  document.getElementById("ultimosPartidos").innerHTML = cards.join("");
}

function actualizarGrafico(tipo = "puntos") {
  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) return;

  const datos = calcularPuntos();

  // Asegura que todos los jugadores estén representados si se filtra por tipo
  const ordenados = Object.entries(datos)
    .sort((a, b) => b[1][tipo] - a[1][tipo]);

  const labels = ordenados.map(([nombre]) => nombre);
  const data = ordenados.map(([, valores]) => valores[tipo]);

  if (chartJugadores) chartJugadores.destroy();

  chartJugadores = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        data,
        backgroundColor: "#26c6da"
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}
function renderHistorico() {
  const contenedor = document.getElementById("historialJugadores");
  if (!contenedor) return;

  const tipos = ["puntos", "goles", "figura", "partidos"];
  const datos = calcularPuntos();

  contenedor.innerHTML = tipos.map(tipo => {
    const ordenados = Object.entries(datos)
      .sort((a, b) => b[1][tipo] - a[1][tipo]);

    const tarjetas = ordenados.map(([nombre, stats]) => `
      <div class="tarjetaHistorial">
        <strong>${nombre}</strong>
        <span>${stats[tipo]}</span>
        <small>${tipo}</small>
      </div>
    `).join("");

    return `
      <div class="sliderHistorial">
        <h3>🏆 Ranking por ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h3>
        <div class="sliderCarrusel">${tarjetas}</div>
      </div>
    `;
  }).join("");
}



// 🎯 Inicialización al cargar
document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatos();
  actualizarGrafico("puntos");
  renderUltimosPartidos();
  renderHistorico();
  inicializarFiltrosFecha?.();

  document.getElementById("tipoGrafico")?.addEventListener("change", (e) => {
    actualizarGrafico(e.target.value);
  });
});

// 🎛 Cambiar entre pestañas
function mostrarTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.style.display = "none";
  });
  document.getElementById(tabId).style.display = "block";
}

// 🪟 Abrir y cerrar modal de formulario
function abrirModalFormulario() {
  const modal = document.getElementById("modalFormulario");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "block";
  modal.style.display = "flex";
  requestAnimationFrame(() => modal.classList.add("show"));
}

function cerrarModalFormulario() {
  const modal = document.getElementById("modalFormulario");
  modal.classList.remove("show");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "none";
  setTimeout(() => (modal.style.display = "none"), 300);
  document.getElementById("formPartido").reset();
  document.querySelector(".equipos-grid").style.display = "none";
}

// 🪟 Modal Agregar Jugador
function abrirModalJugador() {
  const modal = document.getElementById("modalJugador");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "block";
  modal.style.display = "flex";
  requestAnimationFrame(() => modal.classList.add("show"));
}

function cerrarModalJugador() {
  const modal = document.getElementById("modalJugador");
  modal.classList.remove("show");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "none";
  setTimeout(() => (modal.style.display = "none"), 300);
}

// ➕ Agregar nuevo jugador desde el modal
document.getElementById("formJugador").addEventListener("submit", e => {
  e.preventDefault();
  guardarSeleccionTemporal(); // Guardamos selección antes de resetear el formulario

  const nombre = document.getElementById("nuevoJugador").value.trim();

  if (!nombre) {
    alert("El nombre no puede estar vacío");
    return;
  }

  if (jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase())) {
    alert("⚠️ Ese nombre ya está registrado. Agregá una letra o referencia.");
    return;
  }

  const nuevoID = jugadores.length ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
  jugadores.push({ id: nuevoID, nombre, tel: '', estado: 'suplente', nuevo: true });

  poblarFormulario();
  aplicarSeleccionTemporal(); // Restauramos después de regenerar
  cerrarModalJugador();
});

// Al escribir nombre de partido se activa el grid de equipos
document.getElementById("nombre_partido").addEventListener("input", () => {
  const valor = document.getElementById("nombre_partido").value.trim();
  if (valor) {
    document.querySelector(".equipos-grid").style.display = "grid";
    poblarFormulario();
  }
});
// 📨 Enviar formulario completo a n8n
document.getElementById("formPartido")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const torneo = document.getElementById("nombre_torneo").value.trim();
  const fecha_inicio_torneo = document.getElementById("fecha_inicio_torneo").value;
  const fecha_partido = document.getElementById("fecha_partido").value;
  const nombre_partido = document.getElementById("nombre_partido").value.trim();
  const figura_nombre = document.getElementById("selectFigura").value;

  const blancos = obtenerJugadores("Blanco");
  const negros = obtenerJugadores("Negro");
  const todos = [...blancos, ...negros];

  const figuraID = jugadores.find(j => j.nombre === figura_nombre)?.id || null;

  const formacion = [{
    fecha_partido,
    nombre_partido,
    votante: "web",
    figura_votada: figura_nombre,
    id_jugador_votado: figuraID,
    telefono: "",
    flag_ausencia_voto: 0
  }];

  const nuevoNombre = document.getElementById("nuevoJugador").value.trim();
  let nuevoJugador = null;

  if (nuevoNombre && !jugadores.some(j => j.nombre.toLowerCase() === nuevoNombre.toLowerCase())) {
    const nuevoID = jugadores.length ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
    nuevoJugador = {
      id: nuevoID,
      nombre: nuevoNombre,
      estado: "suplente",
      telefono: "",
      fecha_alta: new Date().toISOString().split("T")[0]
    };
  }

  const payload = {
    jugadores: todos.map(j => ({
      ...j,
      torneo,
      fecha_inicio_torneo,
      fecha_partido,
      nombre_partido
    })),
    formacion,
    nuevoJugador
  };

  try {
    await fetch(WEBHOOK_PARTIDO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("✅ Partido enviado correctamente.");
    document.getElementById("formPartido").reset();
    document.querySelector(".equipos-grid").style.display = "none";
    cerrarModalFormulario();
    location.reload(); // para ver el impacto en tarjetas y gráficos
  } catch (err) {
    console.error("❌ Error al enviar", err);
    alert("No se pudo enviar el partido.");
  }
});

// Guardar y restaurar selección temporal del formulario
let seleccionTemporal = { Blanco: [], Negro: [] };

function guardarSeleccionTemporal() {
  ["Blanco", "Negro"].forEach(equipo => {
    seleccionTemporal[equipo] = Array.from(document.querySelectorAll(`#equipo${equipo} .filaJugador`)).map(fila => {
      const jugador = fila.querySelector("select")?.value || "";
      const goles = fila.querySelector(".inputGoles")?.value || "";
     const tarde = fila.querySelector("input[type='checkbox']").checked || false;
      const minutos = fila.querySelector(".inputMinTarde")?.value || "";
      return { jugador, goles, tarde, minutos };
    });
  });
}

function aplicarSeleccionTemporal() {
  ["Blanco", "Negro"].forEach(equipo => {
    const filas = document.querySelectorAll(`#equipo${equipo} .filaJugador`);
    filas.forEach((fila, i) => {
      const data = seleccionTemporal[equipo][i];
      if (!data) return;
      const select = fila.querySelector("select");
      const goles = fila.querySelector(".inputGoles");
      const tarde = fila.querySelector("input[type='checkbox']");
      const minutos = fila.querySelector(".inputMinTarde");

      if (select) select.value = data.jugador;
      if (goles) goles.value = data.goles;
      if (tarde) tarde.checked = data.tarde;
      if (minutos) {
        minutos.value = data.minutos;
        minutos.style.display = data.tarde ? "inline-block" : "none";
      }
    });
  });
}

// Renderizar los select y inputs por equipo
function poblarFormulario() {
  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const fila = document.createElement("div");
      fila.className = "filaJugador";

      const select = document.createElement("select");
      select.required = true;

      const defaultOpt = document.createElement("option");
      defaultOpt.text = "Selecciona jugador";
      defaultOpt.disabled = true;
      defaultOpt.selected = true;
      select.appendChild(defaultOpt);

      jugadores.forEach(j => {
        const opt = document.createElement("option");
        opt.value = j.nombre;
        opt.textContent = j.nombre;
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        prepararVotacion([
          ...obtenerJugadores("Blanco"),
          ...obtenerJugadores("Negro"),
        ]);
      });

      const inputGoles = document.createElement("input");
      inputGoles.type = "number";
      inputGoles.placeholder = "Goles";
      inputGoles.min = 0;
      inputGoles.className = "inputGoles";

      const checkTarde = document.createElement("input");
      checkTarde.type = "checkbox";
      checkTarde.title = "Llegó tarde";

      const inputMin = document.createElement("input");
      inputMin.type = "number";
      inputMin.placeholder = "Min. tarde";
      inputMin.className = "inputMinTarde";
      inputMin.min = 0;
      inputMin.style.display = "none";

      checkTarde.addEventListener("change", () => {
        inputMin.style.display = checkTarde.checked ? "inline-block" : "none";
      });

      fila.appendChild(select);
      fila.appendChild(inputGoles);
      fila.appendChild(checkTarde);
      fila.appendChild(inputMin);
      contenedor.appendChild(fila);
    }
  });

  prepararVotacion([]);
}

// Obtener datos del formulario
function obtenerJugadores(equipo) {
  return Array.from(document.querySelectorAll(`#equipo${equipo} .filaJugador`)).map(fila => {
    const select = fila.querySelector("select");
    const nombre = select.value;
    const goles = parseInt(fila.querySelector(".inputGoles").value || '0');
    const llegoTarde = fila.querySelector("input[type='checkbox']").checked;
    const minutosTarde = llegoTarde ? parseInt(fila.querySelector(".inputMinTarde").value || '0') : 0;
    const info = jugadores.find(j => j.nombre === nombre) || {};

    return {
      equipo,
      jugador_nombre: nombre,
      goles_partido: goles,
      flageado: 1,
      llego_tarde: llegoTarde ? 1 : 0,
      minutos_tarde: minutosTarde,
      tel: info.tel || '',
      id_jugador: info.id || null
    };
  });
}

// Preparar opciones del select de figura
function prepararVotacion(jugadoresPartido) {
  const select = document.getElementById("selectFigura");
  if (!select) return;

  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.text = "Selecciona figura";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

  jugadoresPartido.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j.jugador_nombre || j.jugador;
    opt.textContent = j.jugador_nombre || j.jugador;
    select.appendChild(opt);
  });

  select.style.display = "block";
}
function inicializarFiltrosFecha() {
  const anios = [...new Set(partidos.map(p => new Date(p.fecha_partido).getFullYear()))];
  const selectAnio = document.getElementById("selectAnio");
  const selectMes = document.getElementById("selectMes");

  selectAnio.innerHTML = `<option value="">Todos</option>` + anios.map(a => `<option value="${a}">${a}</option>`).join("");
  selectMes.innerHTML = `<option value="">Todos</option>` + Array.from({ length: 12 }, (_, i) => {
    const mesNombre = new Date(0, i).toLocaleString("es", { month: "long" });
    return `<option value="${i + 1}">${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</option>`;
  }).join("");
}

function filtrarPartidosPorMes() {
  const anio = parseInt(document.getElementById("selectAnio").value);
  const mes = parseInt(document.getElementById("selectMes").value);
  const contenedor = document.getElementById("partidosFiltrados");
  contenedor.innerHTML = "";

  const partidosAgrupados = {};
  partidos.forEach(p => {
    const fecha = new Date(p.fecha_partido);
    if ((!anio || fecha.getFullYear() === anio) && (!mes || fecha.getMonth() + 1 === mes)) {
      const clave = `${p.fecha_partido}__${p.nombre_partido}`;
      if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
      partidosAgrupados[clave].push(p);
    }
  });

  const html = Object.entries(partidosAgrupados).map(([clave, jugadores]) => {
    const blanco = jugadores.filter(j => j.equipo === "Blanco");
    const negro = jugadores.filter(j => j.equipo === "Negro");
    const golesB = blanco.reduce((acc, j) => acc + j.goles, 0);
    const golesN = negro.reduce((acc, j) => acc + j.goles, 0);
    const figura = formaciones.find(f => f.fecha_partido === jugadores[0].fecha_partido && f.nombre_partido === jugadores[0].nombre_partido)?.figura_votada || "-";
    const goleador = jugadores.reduce((max, j) => j.goles > max.goles ? j : max, { goles: -1 }).jugador || "-";

    return `
      <div class="cardPartidoCompacto">
        <strong>${clave.replace("__", " - ")}</strong><br/>
        ⚪ ${golesB} vs ${golesN} ⚫<br/>
        🥅 Goleador: ${goleador}<br/>
        ⭐ Figura: ${figura}
      </div>
    `;
  }).join("");

  contenedor.innerHTML = html || "<p>No se encontraron partidos para ese período.</p>";
}
function mostrarRanking(tipo) {
  const contenedor = document.getElementById("contenedorRanking");
  const datos = calcularPuntos();
  const ordenados = Object.entries(datos).sort((a, b) => b[1][tipo] - a[1][tipo]);

  const filas = ordenados.map(([nombre, stats], i) => {
    const estado = jugadores.find(j => j.nombre === nombre)?.estado || "-";
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${nombre}</td>
        <td>${estado}</td>
        <td>${stats[tipo]}</td>
      </tr>
    `;
  }).join("");

  contenedor.innerHTML = `
    <table class="tablaRanking">
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Estado</th>
          <th>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

