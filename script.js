const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook-test/cargar-partido";

let jugadores = [];
let partidos = [];

// 🔄 Cargar jugadores desde Google Sheets
async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    jugadores = data.values.slice(1).map(([id, nombre, tel]) => ({
      id: parseInt(id), nombre, tel
    }));
  } catch (err) {
    console.error("Error al cargar jugadores:", err);
  }
}

// 🧩 Modal de jugador
function abrirModalJugador() {
  document.getElementById("modalJugador").style.display = "flex";
  document.getElementById("overlay").style.display = "block";
}
function cerrarModalJugador() {
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("nuevoJugador").value = "";
}

// ➕ Agregar jugador al array
document.getElementById("formJugador").addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre) return alert("El nombre no puede estar vacío");
  const nuevoID = jugadores.length > 0 ? jugadores[jugadores.length - 1].id + 1 : 1;
  jugadores.push({ id: nuevoID, nombre, tel: '', nuevo: true });
  poblarFormulario();
  cerrarModalJugador();
});
// 🧩 Al escribir nombre del partido, se habilita formulario
document.getElementById("nombre_partido").addEventListener("input", () => {
  const valor = document.getElementById("nombre_partido").value.trim();
  if (valor) {
    document.querySelector(".equipos-grid").style.display = "grid";
    poblarFormulario();
  }
});

// 🧮 Renderizar inputs de jugadores por equipo
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
}
// 🧩 Obtener datos de jugadores del formulario
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
      jugador: nombre,
      goles,
      flageado: 1,
      llego_tarde: llegoTarde ? 1 : 0,
      minutos_tarde: minutosTarde,
      tel: info.tel || '',
      id_jugador: info.id || null
    };
  });
}

// 📨 Enviar formulario completo
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
    opt.value = j.jugador;
    opt.textContent = j.jugador;
    select.appendChild(opt);
  });

  document.getElementById("selectFigura").style.display = "block";
}

// 🧩 Render de últimos partidos
function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach(p => {
    const clave = `${p.fecha_partido} - ${p.nombre_partido}`;
    if (!agrupados[clave]) agrupados[clave] = [];
    agrupados[clave].push(p);
  });

  const ultimos = Object.entries(agrupados)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 5);

  const cards = ultimos.map(([clave, jugadores]) => {
    let golesBlanco = 0, golesNegro = 0;
    let goleador = jugadores[0];

    jugadores.forEach(j => {
      if (j.equipo === "Blanco") golesBlanco += j.goles;
      else golesNegro += j.goles;
      if (j.goles > goleador.goles) goleador = j;
    });

    return `
      <div class="cardPartido">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador}
      </div>
    `;
  });

  document.getElementById("ultimosPartidos").innerHTML = cards.join("");
}
// 📊 Cálculo de estadísticas
function calcularEstadisticas(tipo) {
  const datos = {};

  partidos.forEach((p) => {
    if (!p.jugador) return;
    if (!datos[p.jugador]) {
      datos[p.jugador] = { puntos: 0, goles: 0, partidos: 0 };
    }
    datos[p.jugador].partidos += 1;
    datos[p.jugador].goles += p.goles;
    datos[p.jugador].puntos += p.goles + 1;
  });

  const ordenados = Object.entries(datos)
    .sort((a, b) => b[1][tipo] - a[1][tipo])
    .slice(0, 10);

  return {
    labels: ordenados.map((e) => e[0]),
    data: ordenados.map((e) => e[1][tipo]),
    label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
  };
}

let chartJugadores;

function actualizarGrafico(tipo = "puntos") {
  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) return;

  const { labels, data, label } = calcularEstadisticas(tipo);
  if (chartJugadores) chartJugadores.destroy();

  chartJugadores = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: "#26c6da",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } },
    },
  });
}

// 🎯 Eventos de carga
document.addEventListener("DOMContentLoaded", () => {
  cargarJugadores();
  actualizarGrafico("puntos");

  document
    .getElementById("tipoGrafico")
    ?.addEventListener("change", (e) => {
      actualizarGrafico(e.target.value);
    });

  document
    .getElementById("nombre_partido")
    ?.addEventListener("change", () => {
      if (document.getElementById("nombre_partido").value.trim()) {
        poblarFormulario();
        document.querySelector(".equipos-grid").style.display = "grid";
      }
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
  document.getElementById("modalFormulario").style.display = "block";
}

function cerrarModalFormulario() {
  document.getElementById("modalFormulario").style.display = "none";
  document.getElementById("formPartido").reset();
  document.querySelector(".equipos-grid").style.display = "none";
}

// 🪟 Abrir y cerrar modal de jugador nuevo
function abrirModalJugador() {
  document.getElementById("modalJugador").style.display = "block";
  document.getElementById("overlay").style.display = "block";
}

function cerrarModalJugador() {
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}
