const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

let jugadores = [];
let partidos = [];

window.addEventListener("load", async () => {
  await cargarJugadores();
  await cargarPartidos();
  document.getElementById("loader").style.display = "none";
});

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
// 📋 Poblar selects de formulario (grilla vertical)
function poblarFormulario() {
  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const div = document.createElement("div");
      div.className = "jugador-input";

      const select = document.createElement("select");
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Selecciona jugador";
      defaultOpt.disabled = true;
      defaultOpt.selected = true;
      select.appendChild(defaultOpt);

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
      <div class="card">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador}
      </div>
    `;
  });

  document.getElementById("cardsPartidos").innerHTML = cards.join("");
}

// 📊 Renderizar gráfico de posiciones
function renderGraficos() {
  const puntosPorJugador = {};

  partidos.forEach(p => {
    const puntos = p.goles > 0 ? 1 : 0;
    if (!puntosPorJugador[p.jugador]) puntosPorJugador[p.jugador] = 0;
    puntosPorJugador[p.jugador] += puntos;
  });

  const top = Object.entries(puntosPorJugador)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  new Chart(document.getElementById("graficoPosiciones"), {
    type: "bar",
    data: {
      labels: top.map(e => e[0]),
      datasets: [{
        label: "Puntos",
        data: top.map(e => e[1]),
        backgroundColor: "#00695c"
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

// 🚀 Iniciar carga al enviar (placeholder, se conecta en el siguiente paso)
document.getElementById("formPartido").addEventListener("submit", e => {
  e.preventDefault();
  alert("En el próximo paso conectaremos esta carga a Google Sheets o n8n.");
});

