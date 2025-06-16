const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-partido";

let jugadores = [];
let partidos = [];
let formaciones = [];
let chartJugadores;

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

    jugadores = jugData.values.slice(1).map(([id, nombre, tel]) => ({
      id: parseInt(id), nombre, tel
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
      flageado: parseInt(row[8]) || 0,
      llego_tarde: parseInt(row[9]) || 0,
      minutos_tarde: parseInt(row[10]) || 0,
    }));

    formaciones = formData.values.slice(1).map(([fecha, nombrePartido, votante, figura, idFigura]) => ({
      fecha_partido: fecha,
      nombre_partido: nombrePartido,
      figura_votada: figura,
      id_jugador_votado: parseInt(idFigura)
    }));

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
}
function calcularPuntos() {
  const puntos = {};

  const partidosAgrupados = {};
  partidos.forEach(p => {
    const clave = ${p.fecha_partido}__${p.nombre_partido};
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

    jugadoresPartido.forEach(j => {
      if (!puntos[j.jugador]) {
        puntos[j.jugador] = { puntos: 0, goles: 0, partidos: 0 };
      }

      puntos[j.jugador].partidos += 1;
      puntos[j.jugador].goles += j.goles;
      puntos[j.jugador].puntos += resultado[j.equipo] || 0;

      if (figuras.includes(j.id_jugador)) {
        puntos[j.jugador].puntos += 1;
      }
    });
  });

  return puntos;
}

function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach(p => {
    const clave = ${p.fecha_partido} - ${p.nombre_partido};
    if (!agrupados[clave]) agrupados[clave] = [];
    agrupados[clave].push(p);
  });

  const ultimos = Object.entries(agrupados)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 3);

  const cards = ultimos.map(([clave, jugadores]) => {
    let golesBlanco = 0, golesNegro = 0;
    let goleador = jugadores[0] || {};
    let figura = "";

    jugadores.forEach(j => {
      if (j.equipo === "Blanco") golesBlanco += j.goles;
      else golesNegro += j.goles;
      if (j.goles > (goleador.goles || 0)) goleador = j;
    });

    const formacion = formaciones.find(f =>
      f.fecha_partido === jugadores[0].fecha_partido &&
      f.nombre_partido === jugadores[0].nombre_partido
    );
    figura = jugadores.find(j => j.id_jugador === formacion?.id_jugador_votado)?.jugador || "-";

    return 
      <div class="cardPartido">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador || "-"}<br/>
        ⭐ Figura: ${figura}
      </div>
    ;
  });

  document.getElementById("ultimosPartidos").innerHTML = cards.join("");

}

function actualizarGrafico(tipo = "puntos") {
  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) return;

  const datos = calcularPuntos();
  const ordenados = Object.entries(datos)
    .sort((a, b) => b[1][tipo] - a[1][tipo])
    .slice(0, 10);

  const labels = ordenados.map(e => e[0]);
  const data = ordenados.map(e => e[1][tipo]);

  if (chartJugadores) chartJugadores.destroy();

  chartJugadores = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          data,
          backgroundColor: "#26c6da"
        }
      ]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}
// 🎯 Eventos al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatos();
  actualizarGrafico("puntos");
  renderUltimosPartidos();
  inicializarFiltrosFecha();



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

// 🪟 Abrir y cerrar modal de jugador nuevo
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
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre) return alert("El nombre no puede estar vacío");

  const nuevoID = jugadores.length ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
  jugadores.push({ id: nuevoID, nombre, tel: '', nuevo: true });
  poblarFormulario();
  cerrarModalJugador();
});

// Mostrar formulario de equipos al escribir nombre del partido
document.getElementById("nombre_partido").addEventListener("input", () => {
  const valor = document.getElementById("nombre_partido").value.trim();
  if (valor) {
    document.querySelector(".equipos-grid").style.display = "grid";
    poblarFormulario();
  }
});

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
// 🧩 Obtener datos de jugadores del formulario
function obtenerJugadores(equipo) {
  return Array.from(document.querySelectorAll(#equipo${equipo} .filaJugador)).map(fila => {
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

  const formacion = [{
    fecha_partido,
    nombre_partido,
    votante: "web",
    figura_votada: "voto manual",
    id_jugador_votado: jugadores.find(j => j.nombre === figura_nombre)?.id || null
  }];

  let nuevoJugador = null;
  const nuevoNombre = document.getElementById("nuevoJugador").value.trim();
  if (nuevoNombre && !jugadores.some(j => j.nombre === nuevoNombre)) {
    const nuevoID = jugadores.length ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
    nuevoJugador = { id: nuevoID, nombre: nuevoNombre, tel: "" };
  }

  const payload = {
    jugadores: todos.map(j => ({
      ...j, torneo, fecha_inicio_torneo, fecha_partido, nombre_partido
    })),
    formacion,
    nuevoJugador,
    mensajeWhatsApp: todos.map(j => ({
      nombre: j.jugador_nombre,
      telefono: j.tel,
      mensaje: 📢 ¡Hola ${j.jugador_nombre}! Se cargó el partido "${nombre_partido}" del torneo ${torneo} (${fecha_partido}).\nPodés ver tus estadísticas y votar a la figura. Recordá que si no votás en 24 horas, se te resta 1 punto.
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
    document.querySelector(".equipos-grid").style.display = "none";
    cerrarModalFormulario();
  } catch (err) {
    console.error("❌ Error al enviar", err);
    alert("No se pudo enviar el partido.");
  }
});

// 🎯 Preparar opciones de votación figura
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
function filtrarPartidosPorMes() {
  const anio = document.getElementById("selectAnio").value;
  const mes = document.getElementById("selectMes").value;
  const contenedor = document.getElementById("partidosFiltrados");
  contenedor.innerHTML = "";

  const partidosAgrupados = {};

  partidos.forEach(p => {
    const fecha = new Date(p.fecha_partido);
    const fechaMes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anioStr = fecha.getFullYear();

    if (fechaMes === mes && String(anioStr) === anio) {
      const clave = ${p.fecha_partido}__${p.nombre_partido};
      if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
      partidosAgrupados[clave].push(p);
    }
  });

  Object.entries(partidosAgrupados).forEach(([clave, jugadores]) => {
    const [fecha, nombre_partido] = clave.split("__");
    const torneo = jugadores[0].torneo;
    const golesBlanco = jugadores.filter(j => j.equipo === "Blanco").reduce((acc, j) => acc + j.goles, 0);
    const golesNegro = jugadores.filter(j => j.equipo === "Negro").reduce((acc, j) => acc + j.goles, 0);

    const div = document.createElement("div");
    div.className = "cardPartidoCompacto";
    div.innerHTML = 
      <strong>${torneo}</strong><br/>
      ${nombre_partido} (${fecha})<br/>
      ⚪ ${golesBlanco} - ${golesNegro} ⚫
    ;
    div.onclick = () => mostrarDetallePartido(jugadores);
    contenedor.appendChild(div);
  });
}
function mostrarDetallePartido(jugadores) {
  if (!jugadores || jugadores.length === 0) return;

  const { torneo, fecha_partido, nombre_partido } = jugadores[0];

  const blanco = jugadores.filter(j => j.equipo === "Blanco");
  const negro = jugadores.filter(j => j.equipo === "Negro");

  const golesBlanco = blanco.reduce((acc, j) => acc + j.goles, 0);
  const golesNegro = negro.reduce((acc, j) => acc + j.goles, 0);

  const puntajes = calcularPuntos(); // Reutilizamos lógica actual
  const goleador = jugadores.reduce((max, j) => j.goles > (max?.goles || 0) ? j : max, null);

  const figuraData = formaciones.find(f => f.fecha_partido === fecha_partido && f.nombre_partido === nombre_partido)
    || votaciones.find(v => v.fecha_partido === fecha_partido && v.nombre_partido === nombre_partido);
  const figura = jugadores.find(j => j.id_jugador === figuraData?.id_jugador_votado)?.jugador || "-";

  const tablaEquipo = (lista, equipo) => 
    <h3>${equipo === "Blanco" ? "⚪ Blanco" : "⚫ Negro"}</h3>
    <table>
      <thead><tr><th>Jugador</th><th>Goles</th><th>Puntos</th></tr></thead>
      <tbody>
        ${lista.map(j => {
          const puntosJugador = puntajes[j.jugador]?.puntos || 0;
          return <tr>
            <td>${j.jugador}</td>
            <td>${j.goles}</td>
            <td style="color:${puntosJugador < 0 ? 'red' : 'inherit'}">${puntosJugador}</td>
          </tr>;
        }).join("")}
      </tbody>
    </table>
  ;

  const modal = document.getElementById("modalDetallePartido");
  const contenido = document.getElementById("contenidoModalDetalle");
  contenido.innerHTML = 
    <span class="close" onclick="cerrarModalDetalle()">&times;</span>
    <h2>${torneo}</h2>
    <p>${nombre_partido} - ${fecha_partido}</p>
    ${tablaEquipo(blanco, "Blanco")}
    ${tablaEquipo(negro, "Negro")}
    <p><strong>🥅 Goleador:</strong> ${goleador?.jugador || "-"} (${goleador?.goles || 0} goles)</p>
    <p><strong>⭐ Figura:</strong> ${figura}</p>
  ;
  modal.style.display = "block";
}

function cerrarModalDetalle() {
  document.getElementById("modalDetallePartido").style.display = "none";
}
