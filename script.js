const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook-test/cargar-partido";

let jugadores = [];
let partidos = [];
let formaciones = [];

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
      id: parseInt(id),
      nombre,
      tel
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
      voto_figura: row[11] || ""
    }));

    formaciones = formData.values.slice(1).map(([fecha, nombrePartido, votante, figura, idFigura]) => ({
      fecha_partido: fecha,
      nombre_partido: nombrePartido,
      votante,
      figura_votada: figura,
      id_jugador_votado: parseInt(idFigura)
    }));

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
}
function calcularPuntosPorJugador(partidos, formaciones) {
  const puntos = {};

  // Agrupar partidos por fecha y nombre del partido
  const partidosAgrupados = {};
  partidos.forEach(p => {
    const clave = `${p.fecha_partido}__${p.nombre_partido}`;
    if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
    partidosAgrupados[clave].push(p);
  });

  // Procesar cada partido
  Object.entries(partidosAgrupados).forEach(([clave, jugadoresPartido]) => {
    const golesBlanco = jugadoresPartido
      .filter(j => j.equipo === "Blanco")
      .reduce((acc, j) => acc + j.goles, 0);
    const golesNegro = jugadoresPartido
      .filter(j => j.equipo === "Negro")
      .reduce((acc, j) => acc + j.goles, 0);

    let resultado = {};
    if (golesBlanco > golesNegro) {
      resultado = { Blanco: 3, Negro: 0 };
    } else if (golesBlanco < golesNegro) {
      resultado = { Blanco: 0, Negro: 3 };
    } else {
      resultado = { Blanco: 1, Negro: 1 };
    }

    const figuras = formaciones
      .filter(f => f.fecha_partido === jugadoresPartido[0].fecha_partido &&
                   f.nombre_partido === jugadoresPartido[0].nombre_partido)
      .map(f => f.id_jugador_votado);

    jugadoresPartido.forEach(j => {
      if (!puntos[j.jugador]) {
        puntos[j.jugador] = { puntos: 0, goles: 0, partidos: 0 };
      }

      puntos[j.jugador].goles += j.goles;
      puntos[j.jugador].partidos += 1;
      puntos[j.jugador].puntos += resultado[j.equipo] || 0;
      if (figuras.includes(j.id_jugador)) {
        puntos[j.jugador].puntos += 1;
      }
    });
  });

  return puntos;
}
let chartJugadores;

function actualizarGrafico(tipo = "puntos") {
  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) return;

  const datos = calcularPuntosPorJugador(partidos, formaciones);
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
      scales: { x: { beginAtZero: true } }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cargarJugadores();
  cargarPartidosYFormacion().then(() => {
    actualizarGrafico("puntos");
    renderUltimosPartidos();
  });

  document.getElementById("tipoGrafico")?.addEventListener("change", (e) => {
    actualizarGrafico(e.target.value);
  });
});
function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach(p => {
    const clave = `${p.fecha_partido} - ${p.nombre_partido}`;
    if (!agrupados[clave]) agrupados[clave] = [];
    agrupados[clave].push(p);
  });

  const ultimos = Object.entries(agrupados)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 3);

  const cards = ultimos.map(([clave, jugadores]) => {
    let golesBlanco = 0, golesNegro = 0;
    let goleador = jugadores[0];
    let figura = "";

    jugadores.forEach(j => {
      if (j.equipo === "Blanco") golesBlanco += j.goles_partido;
      else golesNegro += j.goles_partido;
      if (j.goles_partido > goleador.goles_partido) goleador = j;
      if (j.voto_figura) figura = j.jugador_nombre;
    });

    return `
      <div class="cardPartido">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador_nombre || "-"}<br/>
        ⭐ Figura: ${figura || "-"}
      </div>
    `;
  });

  document.getElementById("ultimosPartidos").innerHTML = cards.join("");
}
function calcularEstadisticas(tipo) {
  const stats = {};

  const partidosAgrupados = {};

  partidos.forEach((p) => {
    const clave = `${p.fecha_partido}-${p.nombre_partido}`;
    if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
    partidosAgrupados[clave].push(p);
  });

  Object.values(partidosAgrupados).forEach((jugadores) => {
    let golesBlanco = 0, golesNegro = 0;
    jugadores.forEach(j => {
      if (j.equipo === "Blanco") golesBlanco += j.goles_partido;
      else golesNegro += j.goles_partido;
    });

    jugadores.forEach(j => {
      const nombre = j.jugador_nombre;
      if (!stats[nombre]) {
        stats[nombre] = { puntos: 0, goles: 0, partidos: 0 };
      }

      stats[nombre].partidos += 1;
      stats[nombre].goles += j.goles_partido;

      const victoria = (j.equipo === "Blanco" && golesBlanco > golesNegro) || 
                       (j.equipo === "Negro" && golesNegro > golesBlanco);
      const empate = golesBlanco === golesNegro;

      if (victoria) stats[nombre].puntos += 3;
      else if (empate) stats[nombre].puntos += 1;

      if (j.voto_figura) stats[nombre].puntos += 1;
    });
  });

  const ordenados = Object.entries(stats)
    .sort((a, b) => b[1][tipo] - a[1][tipo])
    .slice(0, 10);

  return {
    labels: ordenados.map(e => e[0]),
    data: ordenados.map(e => e[1][tipo]),
    label: tipo.charAt(0).toUpperCase() + tipo.slice(1)
  };
}

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
