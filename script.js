const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

let jugadores = [];
let partidos = [];
let filtroActual = "puntos";

// 🚀 Iniciar
(async () => {
  await cargarJugadores();
  await cargarPartidos();
})();
// 📋 Poblar selects de formulario en grilla 5 vs 5
function poblarFormulario() {
  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const div = document.createElement("div");
      div.classList.add("jugador-input");

      const select = document.createElement("select");
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Selecciona jugador";
      select.appendChild(defaultOption);

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
// 🖼 Mostrar últimos partidos en tarjetas resumidas
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
    let votosFigura = {};

    jugadores.forEach(j => {
      if (j.equipo === "Blanco") golesBlanco += j.goles;
      else golesNegro += j.goles;

      if (j.goles > goleador.goles) goleador = j;
      if (j.figura) {
        votosFigura[j.figura] = (votosFigura[j.figura] || 0) + 1;
      }
    });

    const figura = Object.entries(votosFigura)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return `
      <div class="card-partido">
        <strong>${clave}</strong><br/>
        ⚪ ${golesBlanco} vs ${golesNegro} ⚫<br/>
        🥅 Goleador: ${goleador.jugador} (${goleador.goles})<br/>
        ⭐ Figura: ${figura}
      </div>
    `;
  });

  document.getElementById("cardsPartidos").innerHTML = cards.join("");
}
// 📊 Renderizar gráficos con Chart.js dinámico y filtros
function renderGraficos(tipo = "puntos") {
  const porJugador = {};

  partidos.forEach(p => {
    if (!porJugador[p.jugador]) {
      porJugador[p.jugador] = { puntos: 0, goles: 0, partidos: new Set() };
    }
    porJugador[p.jugador].goles += p.goles;
    porJugador[p.jugador].partidos.add(p.partido);

    // puntaje: 3 por victoria (equipo con más goles), 1 empate, +1 si fue goleador
    porJugador[p.jugador].puntos += p.goles; // simplificado
  });

  let datosOrdenados = Object.entries(porJugador).map(([nombre, datos]) => ({
    nombre,
    puntos: datos.puntos,
    goles: datos.goles,
    participaciones: datos.partidos.size
  }));

  datosOrdenados = datosOrdenados.sort((a, b) => b[tipo] - a[tipo]).slice(0, 7);

  const labels = datosOrdenados.map(d => d.nombre);
  const valores = datosOrdenados.map(d => d[tipo]);

  const ctx = document.getElementById("graficoJugadores").getContext("2d");
  if (window.chartJugadores) window.chartJugadores.destroy();

  window.chartJugadores = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: `Top por ${tipo}`,
        data: valores,
        backgroundColor: "#1e88e5"
      }]
    },
    options: {
      animation: { duration: 800 },
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

// 🎛️ Filtro interactivo entre puntos, goles y participaciones
document.querySelectorAll(".btnFiltroGrafico").forEach(btn => {
  btn.addEventListener("click", () => {
    const tipo = btn.dataset.tipo;
    renderGraficos(tipo);
  });
});
// 🚀 Iniciar carga de datos desde Google Sheets
(async () => {
  await cargarJugadores();
  await cargarPartidos();
  renderGraficos(); // por defecto puntos
})();
document.getElementById("formPartido").addEventListener("submit", async e => {
  e.preventDefault();
  const torneo = document.getElementById("nombre_torneo").value;
  const fecha = document.getElementById("fecha_partido").value;
  const partido = document.getElementById("nombre_partido").value;

  const filasBlanco = [...document.querySelectorAll("#equipoBlanco select")];
  const golesBlanco = [...document.querySelectorAll("#equipoBlanco input")];
  const filasNegro = [...document.querySelectorAll("#equipoNegro select")];
  const golesNegro = [...document.querySelectorAll("#equipoNegro input")];

  const jugadoresPartido = [];

  for (let i = 0; i < 5; i++) {
    jugadoresPartido.push({
      nombre_torneo: torneo,
      fecha_inicio_torneo: fecha,
      fecha_partido: fecha,
      nombre_partido: partido,
      jugador_nombre: filasBlanco[i].value,
      id_jugador: buscarID(filasBlanco[i].value),
      equipo: "Blanco",
      goles_partido: parseInt(golesBlanco[i].value),
      flageado: 1
    });
    jugadoresPartido.push({
      nombre_torneo: torneo,
      fecha_inicio_torneo: fecha,
      fecha_partido: fecha,
      nombre_partido: partido,
      jugador_nombre: filasNegro[i].value,
      id_jugador: buscarID(filasNegro[i].value),
      equipo: "Negro",
      goles_partido: parseInt(golesNegro[i].value),
      flageado: 1
    });
  }

  for (const jugador of jugadoresPartido) {
    await fetch("https://juanchi.app.n8n.cloud/webhook/cargar-partido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jugador)
    });
  }

  alert("Partido enviado correctamente.");
  e.target.reset();
});
function buscarID(nombre) {
  const jugador = jugadores.find(j => j.nombre === nombre);
  return jugador ? jugador.id : "NA";
}
