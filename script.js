const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

let jugadores = [];
let partidos = [];

// 🔄 Cargar jugadores
async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  jugadores = data.values.slice(1).map(([id, nombre]) => ({ id, nombre }));
  poblarFormulario();
}

// 🔄 Cargar partidos
async function cargarPartidos() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Partidos?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  partidos = data.values.slice(1).map(row => ({
    torneo: row[0],
    fecha: row[2],
    partido: row[3],
    jugador: row[4],
    id: row[5],
    equipo: row[6],
    goles: parseInt(row[7]),
    flageado: row[8]
  }));
  renderUltimosPartidos();
  renderGraficos();
}
// 📋 Poblar selects de formulario
function poblarFormulario() {
  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const div = document.createElement("div");

      const select = document.createElement("select");
      jugadores.forEach(j => {
        const opt = document.createElement("option");
        opt.value = j.nombre;
        opt.textContent = j.nombre;
        select.appendChild(opt);
      });

      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.placeholder = "Goles";

      div.appendChild(select);
      div.appendChild(input);
      contenedor.appendChild(div);
    }
  });
}

// 🖼 Mostrar últimos partidos
function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach(p => {
    const clave = `${p.fecha} - ${p.partido}`;
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
      <div class="card-partido">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador}<br/>
      </div>
    `;
  });

  document.getElementById("cardsPartidos").innerHTML = cards.join("");
}
// 📊 Renderizar gráficos con Chart.js
function renderGraficos() {
  const porFecha = {};
  const porJugador = {};

  partidos.forEach(p => {
    // goles por fecha
    if (!porFecha[p.fecha]) porFecha[p.fecha] = 0;
    porFecha[p.fecha] += p.goles;

    // goles por jugador
    if (!porJugador[p.jugador]) porJugador[p.jugador] = 0;
    porJugador[p.jugador] += p.goles;
  });

  const fechas = Object.keys(porFecha).sort();
  const goles = fechas.map(f => porFecha[f]);

  new Chart(document.getElementById("graficoGolesPorFecha"), {
    type: "line",
    data: {
      labels: fechas,
      datasets: [{
        label: "Goles Totales",
        data: goles,
        borderColor: "#0d47a1",
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { title: { display: true, text: "Fecha" } },
        y: { title: { display: true, text: "Goles" }, beginAtZero: true }
      }
    }
  });

  const topGoleadores = Object.entries(porJugador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  new Chart(document.getElementById("graficoGoleadores"), {
    type: "bar",
    data: {
      labels: topGoleadores.map(e => e[0]),
      datasets: [{
        label: "Goles",
        data: topGoleadores.map(e => e[1]),
        backgroundColor: "#1976d2"
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

// 🚀 Iniciar carga desde Sheets
(async () => {
  await cargarJugadores();
  await cargarPartidos();
})();

// 📝 Cargar nuevo partido (placeholder)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPartido");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      alert("Funcionalidad de carga se conectará con Google Sheets o n8n en el próximo paso.");
    });
  }
});
