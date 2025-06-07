const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_URL = "https://juanchi.app.n8n.cloud/webhook-test/cargar-partido";

let jugadores = [];
let partidos = [];

// 🔄 Cargar jugadores desde Google Sheets
async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    jugadores = data.values.slice(1).map(([id, nombre]) => ({ id: parseInt(id), nombre }));
    poblarFormulario();
  } catch (err) {
    console.error("Error al cargar jugadores:", err);
  }
}
// 🧩 Modal para agregar jugador nuevo
function abrirModalJugador() {
  document.getElementById("modalJugador").style.display = "flex";
  document.getElementById("overlay").style.display = "block";
}

function cerrarModalJugador() {
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("nuevoJugador").value = "";
}

document.getElementById("formJugador").addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre) return alert("El nombre no puede estar vacío");
  const nuevoID = jugadores.length > 0 ? jugadores[jugadores.length - 1].id + 1 : 1;
  jugadores.push({ id: nuevoID, nombre });
  poblarFormulario();
  cerrarModalJugador();
});
function poblarFormulario() {
  const selectsOcupados = [];

  ["Blanco", "Negro"].forEach(equipo => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const fila = document.createElement("div");
      fila.className = "filaJugador";

      const select = document.createElement("select");
      select.required = true;
      const defaultOption = document.createElement("option");
      defaultOption.text = "Selecciona jugador";
      defaultOption.disabled = true;
      defaultOption.selected = true;
      select.appendChild(defaultOption);

      jugadores.forEach(j => {
        if (!selectsOcupados.includes(j.nombre)) {
          const opt = document.createElement("option");
          opt.value = j.nombre;
          opt.textContent = j.nombre;
          select.appendChild(opt);
        }
      });

      select.addEventListener("change", () => {
        selectsOcupados.push(select.value);
        poblarFormulario(); // repinta para eliminar el jugador seleccionado en el otro equipo
      });

      const input = document.createElement("input");
      input.type = "number";
      input.placeholder = "Goles";
      input.min = 0;
      input.className = "inputGoles";

      fila.appendChild(select);
      fila.appendChild(input);
      contenedor.appendChild(fila);
    }
  });
}
// 🖼 Mostrar últimos partidos
function renderUltimosPartidos() {
  const agrupados = {};

  partidos.forEach((p) => {
    const clave = `${p.fecha} - ${p.partido}`;
    if (!agrupados[clave]) agrupados[clave] = [];
    agrupados[clave].push(p);
  });

  const ultimos = Object.entries(agrupados)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 5);

  const cards = ultimos.map(([clave, jugadores]) => {
    let golesBlanco = 0,
        golesNegro = 0;
    let goleador = jugadores[0];

    jugadores.forEach((j) => {
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

  document.getElementById("cardsPartidos").innerHTML = cards.join("");
}
// 📊 Renderizar gráfico de posiciones
function renderGraficoPosiciones() {
  const puntos = {};

  partidos.forEach((p) => {
    if (!p.jugador) return;
    if (!puntos[p.jugador]) puntos[p.jugador] = 0;
    puntos[p.jugador] += p.goles + 1; // 1 punto por participar
  });

  const top = Object.entries(puntos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map((e) => e[0]),
      datasets: [
        {
          label: "Puntos",
          data: top.map((e) => e[1]),
          backgroundColor: "#00bcd4",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true },
      },
    },
  });
}

// 📊 Cálculo de estadísticas para gráfico filtrable
function calcularEstadisticas(tipo) {
  const datos = {};

  partidos.forEach((p) => {
    if (!p.jugador) return;
    if (!datos[p.jugador]) datos[p.jugador] = { puntos: 0, goles: 0, partidos: 0 };
    datos[p.jugador].partidos += 1;
    datos[p.jugador].goles += p.goles;
    datos[p.jugador].puntos += p.goles + 1;
  });

  const ordenados = Object.entries(datos)
    .sort((a, b) => b[1][tipo] - a[1][tipo])
    .slice(0, 10);

  return {
    labels: ordenados.map(e => e[0]),
    data: ordenados.map(e => e[1][tipo]),
    label: tipo.charAt(0).toUpperCase() + tipo.slice(1)
  };
}
let chartJugadores;

// 🔄 Actualizar gráfico dinámico según filtro
function actualizarGrafico(tipo = "puntos") {
  const ctx = document.getElementById("graficoJugadores")?.getContext("2d");
  if (!ctx) {
    console.warn("⚠️ No se encontró el canvas para el gráfico");
    return;
  }

  const { labels, data, label } = calcularEstadisticas(tipo);

  if (chartJugadores) chartJugadores.destroy();

  chartJugadores = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: "#26c6da"
      }]
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

// 🎛️ Listener para selector de tipo de gráfico
document.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("tipoGrafico");
  if (selector) {
    selector.addEventListener("change", (e) => {
      actualizarGrafico(e.target.value);
    });
  }
});
// 🧩 Función auxiliar para capitalizar etiquetas de estadísticas
function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 🔄 Recalcular estadísticas y actualizar gráfico al iniciar
document.addEventListener("DOMContentLoaded", () => {
  actualizarGrafico("puntos");
});
