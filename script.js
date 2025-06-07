const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
let jugadores = [];
let partidos = [];

async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    jugadores = data.values.slice(1).map(([id, nombre]) => ({
      id: parseInt(id),
      nombre
    }));
    poblarFormulario();
  } catch (err) {
    console.error("Error al cargar jugadores:", err);
  }
}
function abrirModalJugador() {
  document.getElementById("modalJugador").style.display = "flex";
  document.getElementById("overlay").style.display = "block";
}

function cerrarModalJugador() {
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("nuevoJugador").value = "";
}

// Simula guardar el nuevo jugador (en una futura versión usarás un POST a n8n o Google Apps Script)
document.getElementById("formJugador").addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre) {
    alert("El nombre no puede estar vacío.");
    return;
  }

  const nuevoID = jugadores.length > 0 ? jugadores[jugadores.length - 1].id + 1 : 1;
  jugadores.push({ id: nuevoID, nombre });

  alert(`Jugador ${nombre} agregado.`);
  cerrarModalJugador();
  poblarFormulario();
});
function poblarFormulario() {
  ["Blanco", "Negro"].forEach((equipo) => {
    const contenedor = document.getElementById("equipo" + equipo);
    contenedor.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.textContent = equipo === "Blanco" ? "⚪ Equipo Blanco" : "⚫ Equipo Negro";
    contenedor.appendChild(titulo);

    for (let i = 0; i < 5; i++) {
      const fila = document.createElement("div");
      fila.className = "filaJugador";

      const select = document.createElement("select");
      select.required = true;
      const opcionDefault = document.createElement("option");
      opcionDefault.textContent = "Selecciona jugador";
      opcionDefault.disabled = true;
      opcionDefault.selected = true;
      select.appendChild(opcionDefault);

      jugadores.forEach((j) => {
        const opt = document.createElement("option");
        opt.value = j.nombre;
        opt.textContent = j.nombre;
        select.appendChild(opt);
      });

      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.placeholder = "Goles";
      input.className = "inputGoles";

      fila.appendChild(select);
      fila.appendChild(input);
      contenedor.appendChild(fila);
    }
  });
}
// 📝 Guardar partido (versión de prueba)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formPartido");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("La carga del partido se conectará con Google Sheets o n8n en el próximo paso.");
    });
  } else {
    console.error("❌ No se encontró el formulario con id 'formPartido'");
  }
});


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
    puntos[p.jugador] += p.goles + (p.equipo === "Blanco" || p.equipo === "Negro" ? 1 : 0); // puntos arbitrarios +1 por participar
  });

  const top = Object.entries(puntos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const ctx = document.getElementById("graficoPosiciones").getContext("2d");
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
