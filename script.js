const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-partido";
const WEBHOOK_VOTO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-voto";

let jugadores = [];
let partidos = [];
let chartJugadores = null;

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
  jugadores.push({ id: nuevoID, nombre, tel: '' });
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

function obtenerJugadores(equipo) {
  return Array.from(
    document.querySelectorAll(`#equipo${equipo} .filaJugador`)
  ).map((fila) => {
    const select = fila.querySelector('select');
    const jugador = select.value;
    if (jugador === "Selecciona jugador") {
      throw new Error("Faltan jugadores seleccionados en el equipo " + equipo);
    }
    const goles = parseInt(fila.querySelector('input').value || '0');
    const tel = jugadores.find(j => j.nombre === jugador)?.tel || '';
    return { equipo, jugador, goles, tel };
  });
}
function prepararVotacion(jugadoresPartido) {
  const select = document.getElementById('selectFigura');
  if (!select) return;
  select.innerHTML = '';
  jugadoresPartido.forEach(j => {
    const opt = document.createElement('option');
    opt.value = j.jugador;
    opt.textContent = j.jugador;
    select.appendChild(opt);
  });
  document.getElementById('seccionVoto').style.display = 'block';
}

document.getElementById('formPartido')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const torneo = document.getElementById('nombre_torneo').value.trim();
  const fecha = document.getElementById('fecha_partido').value;
  const partido = document.getElementById('nombre_partido').value.trim();

  try {
    const blancos = obtenerJugadores('Blanco');
    const negros = obtenerJugadores('Negro');

    if (blancos.length < 5 || negros.length < 5) {
      return alert('Debes seleccionar 5 jugadores por equipo');
    }

    const datos = [...blancos, ...negros].map(j => ({ ...j, torneo, fecha, partido }));

    await fetch(WEBHOOK_PARTIDO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    prepararVotacion(datos);

    const numeros = datos.map(d => d.tel).filter(Boolean);
    if (numeros.length) {
      await fetch('/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeros, partido })
      });
    }
  } catch (err) {
    console.error('Error guardando partido', err);
    alert('No se pudo guardar el partido');
  }
});
document.getElementById('formFigura')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const jugador = document.getElementById('selectFigura').value;
  const partido = document.getElementById('nombre_partido').value.trim();
  const fecha = document.getElementById('fecha_partido').value;
  try {
    await fetch(WEBHOOK_VOTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador, partido, fecha })
    });
    alert('Voto registrado');
    document.getElementById('seccionVoto').style.display = 'none';
    document.getElementById('formPartido').reset();
    document.querySelector('.equipos-grid').style.display = 'none';
  } catch (err) {
    console.error('Error enviando voto', err);
    alert('No se pudo registrar el voto');
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

  cargarJugadores();
  actualizarGrafico("puntos");

  const nombrePartido = document.getElementById("nombre_partido");
  if (nombrePartido) {
    nombrePartido.addEventListener("change", () => {
      if (nombrePartido.value.trim()) {
        poblarFormulario();
        document.querySelector(".equipos-grid").style.display = "grid";
      }
    });
  }
});
