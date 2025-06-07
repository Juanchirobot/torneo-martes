const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

let jugadores = [];
let partidos = [];
let tipoGrafico = "puntos";

// 🔄 Cargar jugadores desde Google Sheets
async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    jugadores = data.values.slice(1).map(([id, nombre]) => ({ id, nombre }));
    poblarFormulario();
  } catch (error) {
    console.error("Error al cargar jugadores:", error);
  }
}

// 🔄 Cargar partidos desde Google Sheets
async function cargarPartidos() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Partidos?key=${API_KEY}`;
  try {
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
    renderGraficoJugadores();
  } catch (error) {
    console.error("Error al cargar partidos:", error);
  }
}
// 📋 Poblar selects del formulario con estructura por equipo
function poblarFormulario() {
  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = `<h4 class="equipo-titulo">⚪ Equipo ${equipo}</h4>`;
    for (let i = 0; i < 5; i++) {
      const div = document.createElement("div");
      div.className = "jugador-input";

      const select = document.createElement("select");
      select.required = true;
      const placeholder = document.createElement("option");
      placeholder.textContent = "Selecciona jugador";
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

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
      input.required = true;

      div.appendChild(select);
      div.appendChild(input);
      contenedor.appendChild(div);
    }
  });
}

// 🖼 Mostrar últimos partidos en cards
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
// 📊 Renderizar gráfico de puntos con filtro
function renderGraficoJugadores(tipo = "puntos") {
  const contenedor = document.getElementById("graficoJugadores");
  contenedor.innerHTML = ""; // limpia contenido previo

  const stats = {};
  partidos.forEach(p => {
    if (!stats[p.jugador]) {
      stats[p.jugador] = { puntos: 0, goles: 0, partidos: new Set() };
    }
    stats[p.jugador].goles += p.goles;
    stats[p.jugador].partidos.add(p.partido);

    // sistema de puntos: victoria 3, empate 1, goleador +1 (simplificado)
    stats[p.jugador].puntos += p.goles; // inicial (1 punto por gol)
  });

  const data = Object.entries(stats).map(([jugador, info]) => ({
    jugador,
    valor: tipo === "puntos" ? info.puntos : tipo === "goles" ? info.goles : info.partidos.size
  }));

  data.sort((a, b) => b.valor - a.valor);

  const canvas = document.createElement("canvas");
  contenedor.appendChild(canvas);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: data.map(d => d.jugador),
      datasets: [{
        label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        data: data.map(d => d.valor),
        backgroundColor: "#26a69a"
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

// 🎛 Filtro de gráfico interactivo
document.getElementById("filtroJugadores").addEventListener("change", (e) => {
  renderGraficoJugadores(e.target.value);
});
// 🖼 Renderizar últimas 5 fechas
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
        🥅 Goleador: ${goleador.jugador}
      </div>
    `;
  });

  document.getElementById("cardsPartidos").innerHTML = cards.join("");
}

// 🚀 Iniciar
(async () => {
  await cargarJugadores();
  await cargarPartidos();
  renderGraficoJugadores("puntos");
})();
// 📤 Enviar datos del partido a n8n o Sheets (solo ejemplo local)
document.getElementById("formPartido").addEventListener("submit", async (e) => {
  e.preventDefault();
  const torneo = document.getElementById("nombre_torneo").value;
  const fecha = document.getElementById("fecha_partido").value;
  const nombre = document.getElementById("nombre_partido").value;
  const nuevos = [];

  ["Blanco", "Negro"].forEach(equipo => {
    const filas = document.querySelectorAll(`#equipo${equipo} div`);
    filas.forEach(fila => {
      const nombreJugador = fila.querySelector("select").value;
      const goles = parseInt(fila.querySelector("input").value);
      if (nombreJugador && !isNaN(goles)) {
        const jugador = jugadores.find(j => j.nombre === nombreJugador);
        nuevos.push({
          torneo,
          fecha_inicio_torneo: fecha,
          fecha,
          partido: nombre,
          jugador: nombreJugador,
          id: jugador?.id || "",
          equipo,
          goles,
          flageado: 1
        });
      }
    });
  });

  for (const d of nuevos) {
    await fetch("https://juanchi.app.n8n.cloud/webhook/torneo-martes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d)
    });
  }

  alert("Partido enviado correctamente.");
  document.getElementById("formPartido").reset();
});
