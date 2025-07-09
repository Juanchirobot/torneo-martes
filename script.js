const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-partido";

let jugadores = [];
let partidos = [];
let formaciones = [];
let chartJugadores = null;

// 🔍 Determina la figura más votada por partido
function obtenerFiguraPartido(fecha, nombrePartido) {
  console.log("📌 Buscando figura para:", fecha, nombrePartido);

  const votos = formaciones.filter(v => {
    const matchFecha = v.fecha_partido === fecha;
    const matchNombre = v.nombre_partido === nombrePartido;

    if (!matchFecha || !matchNombre) {
      console.log("❌ No coincide:", {
        registro: v,
        matchFecha,
        matchNombre
      });
    }

    return matchFecha && matchNombre;
  });

  const conteo = {};
  votos.forEach(v => {
    const nombre = (v.figura_votada || '').toLowerCase().trim();
    if (!nombre) return;
    conteo[nombre] = (conteo[nombre] || 0) + 1;
  });

  console.log("🟨 Votos recolectados:", votos);
  console.log("📊 Conteo de figura:", conteo);

  if (!Object.keys(conteo).length) return null;
  const figura = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
  console.log("⭐ Figura detectada:", figura);
  return figura;
}



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

    const figuraNombre = obtenerFiguraPartido(
      jugadoresPartido[0].fecha_partido,
      jugadoresPartido[0].nombre_partido
    );

    const maxGoles = Math.max(...jugadoresPartido.map(j => j.goles));
    const goleadores = jugadoresPartido.filter(j => j.goles === maxGoles);
    const hayUnicoGoleador = goleadores.length === 1;
    const idUnicoGoleador = hayUnicoGoleador ? goleadores[0].id_jugador : null;

    jugadoresPartido.forEach(j => {
      if (!puntos[j.id_jugador]) {
        puntos[j.id_jugador] = {
          nombre: j.jugador,
          puntos: 0,
          goles: 0,
          partidos: 0,
          figura: 0
        };
      }

      puntos[j.id_jugador].partidos += 1;
      puntos[j.id_jugador].goles += j.goles;
      puntos[j.id_jugador].puntos += resultado[j.equipo] || 0;

      if (figuraNombre && j.jugador.toLowerCase().trim() === figuraNombre.toLowerCase()) {
        puntos[j.id_jugador].puntos += 1;
        puntos[j.id_jugador].figura += 1;
      }

      if (j.id_jugador === idUnicoGoleador) {
        puntos[j.id_jugador].puntos += 1;
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

figura = obtenerFiguraPartido(
  jugadores[0].fecha_partido,
  jugadores[0].nombre_partido
) || "-";


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
  const ordenados = Object.values(datos).sort((a, b) => b[tipo] - a[tipo]);

  const labels = ordenados.map(j => j.nombre);
  const data = ordenados.map(j => j[tipo]);

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

    const figuraRaw = obtenerFiguraPartido(jugadores[0].fecha_partido, jugadores[0].nombre_partido);
    figura = figuraRaw ? figuraRaw.charAt(0).toUpperCase() + figuraRaw.slice(1) : "-";

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

function mostrarRanking(tipo) {
  const contenedor = document.getElementById("contenedorRanking");
  const datos = calcularPuntos();
  const ordenados = Object.values(datos).sort((a, b) => b[tipo] - a[tipo]);

  const filas = ordenados.map((stats, i) => {
    const estado = jugadores.find(j => j.nombre === stats.nombre)?.estado || "-";
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${stats.nombre}</td>
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

function renderHistorico() {
  const contenedor = document.getElementById("historialJugadores");
  if (!contenedor) return;

  const tipos = ["puntos", "goles", "figura", "partidos"];
  const datos = calcularPuntos();

  contenedor.innerHTML = tipos.map(tipo => {
    const ordenados = Object.values(datos)
      .sort((a, b) => b[tipo] - a[tipo]);

    const tarjetas = ordenados.map(j => `
      <div class="tarjetaHistorial">
        <strong>${j.nombre}</strong>
        <span>${j[tipo]}</span>
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

// 🏁 Torneo activo
function iniciarTorneo() {
  const nombre = prompt("Nombre del torneo:");
  const fecha = prompt("Fecha de inicio del torneo (YYYY-MM-DD):");
  if (!nombre || !fecha) return alert("⚠️ Faltan datos.");
  localStorage.setItem("torneoActual", JSON.stringify({ nombre, fecha }));
  alert("✅ Torneo guardado correctamente.");
}

function terminarTorneo() {
  localStorage.removeItem("torneoActual");
  alert("🗑️ Torneo eliminado. Deberás escribirlo a mano la próxima vez.");
}

// 🔃 Al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatos();
  actualizarGrafico("puntos");
  renderUltimosPartidos();
  renderHistorico();

  document.getElementById("tipoGrafico")?.addEventListener("change", (e) => {
    actualizarGrafico(e.target.value);
  });
});

// 🪟 Abrir formulario y autocompletar torneo
function abrirModalFormulario() {
  const modal = document.getElementById("modalFormulario");
  const overlay = document.getElementById("overlay");
  overlay.style.display = "block";
  modal.style.display = "flex";

  const torneoGuardado = JSON.parse(localStorage.getItem("torneoActual") || "null");
  if (torneoGuardado) {
    document.getElementById("nombre_torneo").value = torneoGuardado.nombre;
    document.getElementById("fecha_inicio_torneo").value = torneoGuardado.fecha;
  }

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

// ➕ Agregar nuevo jugador desde modal
document.getElementById("formJugador").addEventListener("submit", e => {
  e.preventDefault();
  guardarSeleccionTemporal();

  const nombre = document.getElementById("nuevoJugador").value.trim();

  if (!nombre) return alert("El nombre no puede estar vacío");

  if (jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase())) {
    alert("⚠️ Ese nombre ya está registrado.");
    return;
  }

  const nuevoID = jugadores.length ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
  jugadores.push({ id: nuevoID, nombre, tel: '', estado: 'suplente', nuevo: true });

  poblarFormulario();
  aplicarSeleccionTemporal();
  cerrarModalJugador();
});

// Mostrar equipos al escribir nombre
document.getElementById("nombre_partido").addEventListener("input", () => {
  const valor = document.getElementById("nombre_partido").value.trim();
  if (valor) {
    document.querySelector(".equipos-grid").style.display = "grid";
    poblarFormulario();
  }
});

// 📨 Enviar formulario a n8n
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

const jugadoresNuevos = jugadores.filter(j => j.nuevo);
const jugadoresTitulares = [...blancos, ...negros];

const payload = {
  jugadores: jugadoresNuevos.map(j => ({
    fecha_alta: new Date().toISOString().split("T")[0],
    id_jugador: j.id,
    nombre_jugador: j.nombre,
    Estado: "suplente",
    telefono: j.tel || ""
  })),
  partidos: jugadoresTitulares.map(j => ({
    nombre_torneo: torneo,
    fecha_inicio_torneo,
    fecha_partido,
    nombre_partido,
    jugador_nombre: j.jugador_nombre,
    id_jugador: j.id_jugador,
    equipo: j.equipo,
    goles_partido: j.goles_partido,
    flag_figura: j.id_jugador === figuraID ? 1 : 0,
    puntos: 0 // puede calcularse luego si querés
  })),
  formacion: jugadoresTitulares.map(j => ({
    fecha_partido,
    nombre_partido,
    votante: j.jugador_nombre,
    figura_votada: figura_nombre,
    id_jugador_votado: figuraID,
    telefono: "web",
    flag_ausencia_voto: 0
  }))
};

  try {
    await fetch(WEBHOOK_PARTIDO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("✅ Partido enviado correctamente.");
    document.getElementById("formPartido").reset();
    cerrarModalFormulario();
    location.reload();
  } catch (err) {
    console.error("❌ Error al enviar", err);
    alert("No se pudo enviar el partido.");
  }
});

// Guardar y restaurar selección temporal
let seleccionTemporal = { Blanco: [], Negro: [] };

function guardarSeleccionTemporal() {
  ["Blanco", "Negro"].forEach(equipo => {
    seleccionTemporal[equipo] = Array.from(document.querySelectorAll(`#equipo${equipo} .filaJugador`)).map(fila => {
      const jugador = fila.querySelector("select")?.value || "";
      const goles = fila.querySelector(".inputGoles")?.value || "";
      return { jugador, goles };
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
      if (select) select.value = data.jugador;
      if (goles) goles.value = data.goles;
    });
  });
}

// Renderizar selects de jugadores
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

      const inputGoles = document.createElement("input");
      inputGoles.type = "number";
      inputGoles.placeholder = "Goles";
      inputGoles.min = 0;
      inputGoles.className = "inputGoles";

      fila.appendChild(select);
      fila.appendChild(inputGoles);
      contenedor.appendChild(fila);
    }
  });

  prepararVotacion([]);
}

function obtenerJugadores(equipo) {
  return Array.from(document.querySelectorAll(`#equipo${equipo} .filaJugador`)).map(fila => {
    const select = fila.querySelector("select");
    const nombre = select.value;
    const goles = parseInt(fila.querySelector(".inputGoles").value || '0');
    const info = jugadores.find(j => j.nombre === nombre) || {};

    return {
      equipo,
      jugador_nombre: nombre,
      goles_partido: goles,
      id_jugador: info.id || null
    };
  });
}

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

// 🎛 Cambiar entre pestañas
function mostrarTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.style.display = "none";
  });
  const seleccionada = document.getElementById(tabId);
  if (seleccionada) seleccionada.style.display = "block";
}

