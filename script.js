const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook-test/cargar-partido";

let jugadores = [];
let partidos = [];

async function cargarJugadores() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    jugadores = data.values.slice(1).map(([id, nombre, tel]) => ({ id: parseInt(id), nombre, tel }));
  } catch (err) {
    console.error("Error al cargar jugadores:", err);
  }
}
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
        poblarFormulario();
      });

      const inputGoles = document.createElement("input");
      inputGoles.type = "number";
      inputGoles.placeholder = "Goles";
      inputGoles.min = 0;
      inputGoles.className = "inputGoles";

      const checkTarde = document.createElement("input");
      checkTarde.type = "checkbox";
      checkTarde.title = "Llegó tarde";

      const inputMinutos = document.createElement("input");
      inputMinutos.type = "number";
      inputMinutos.placeholder = "Minutos tarde";
      inputMinutos.min = 0;
      inputMinutos.className = "inputMinTarde";
      inputMinutos.style.display = "none";

      checkTarde.addEventListener("change", () => {
        inputMinutos.style.display = checkTarde.checked ? "inline-block" : "none";
      });

      fila.appendChild(select);
      fila.appendChild(inputGoles);
      fila.appendChild(checkTarde);
      fila.appendChild(inputMinutos);
      contenedor.appendChild(fila);
    }
  });
}
function obtenerJugadores(equipo) {
  return Array.from(
    document.querySelectorAll(`#equipo${equipo} .filaJugador`)
  ).map((fila) => {
    const select = fila.querySelector("select");
    const jugador = select.value;
    const goles = parseInt(fila.querySelector(".inputGoles").value || '0');
    const llegoTarde = fila.querySelector("input[type='checkbox']").checked;
    const minutosTardeInput = fila.querySelector(".inputMinTarde");
    const minutosTarde = llegoTarde ? parseInt(minutosTardeInput.value || '0') : 0;

    const infoJugador = jugadores.find(j => j.nombre === jugador) || {};
    return {
      equipo,
      jugador,
      goles,
      flageado: 1,
      llego_tarde: llegoTarde ? 1 : 0,
      minutos_tarde: minutosTarde,
      tel: infoJugador.tel || '',
      id_jugador: infoJugador.id || null
    };
  });
}
document.getElementById('formPartido')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const torneo = document.getElementById('nombre_torneo').value.trim();
  const fecha_inicio = document.getElementById('fecha_inicio_torneo').value;
  const fecha_partido = document.getElementById('fecha_partido').value;
  const nombre_partido = document.getElementById('nombre_partido').value.trim();
  const figura = document.getElementById('selectFigura').value;

  const blancos = obtenerJugadores("Blanco");
  const negros = obtenerJugadores("Negro");
  const jugadoresPartido = [...blancos, ...negros];

  const formacion = [{
    fecha_partido,
    nombre_partido,
    votante: "web",
    figura_votada: "voto manual",
    id_jugador_votado: jugadores.find(j => j.nombre === figura)?.id || null
  }];

  let nuevoJugador = null;
  const nuevoNombre = document.getElementById('nuevoJugador').value.trim();
  if (nuevoNombre && !jugadores.some(j => j.nombre === nuevoNombre)) {
    const nuevoID = jugadores.length > 0 ? Math.max(...jugadores.map(j => j.id)) + 1 : 1;
    nuevoJugador = { id: nuevoID, nombre: nuevoNombre, tel: '' };
  }

  const payload = {
    jugadores: jugadoresPartido.map(j => ({
      ...j,
      torneo,
      fecha_inicio_torneo: fecha_inicio,
      fecha_partido,
      nombre_partido
    })),
    formacion,
    nuevoJugador
  };

  try {
    await fetch("https://juanchi.app.n8n.cloud/webhook-test/cargar-partido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    alert("✅ Partido enviado correctamente.");
  } catch (err) {
    console.error("❌ Error al enviar", err);
    alert("No se pudo enviar el partido.");
  }
});
function prepararVotacion(jugadoresPartido) {
  const select = document.getElementById('selectFigura');
  if (!select) return;

  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.text = 'Selecciona figura';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

  jugadoresPartido.forEach(j => {
    const opt = document.createElement('option');
    opt.value = j.jugador;
    opt.textContent = j.jugador;
    select.appendChild(opt);
  });

  document.getElementById('seccionVoto').style.display = 'block';
}

document.getElementById('formFigura')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  alert("✅ El voto fue registrado en el flujo general al cargar el partido.");
  document.getElementById('seccionVoto').style.display = 'none';
  document.getElementById('formPartido').reset();
  document.querySelector('.equipos-grid').style.display = 'none';
});
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
    let golesBlanco = 0, golesNegro = 0;
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

function renderGraficoPosiciones() {
  const puntos = {};

  partidos.forEach((p) => {
    if (!p.jugador) return;
    if (!puntos[p.jugador]) puntos[p.jugador] = 0;
    puntos[p.jugador] += p.goles + 1;
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
      datasets: [{
        label: "Puntos",
        data: top.map((e) => e[1]),
        backgroundColor: "#00bcd4"
      }]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}
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
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("tipoGrafico");
  if (selector) {
    selector.addEventListener("change", (e) => {
      actualizarGrafico(e.target.value);
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
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
document.getElementById('formPartido')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const torneo = document.getElementById('nombre_torneo').value.trim();
  const fecha = document.getElementById('fecha_partido').value;
  const partido = document.getElementById('nombre_partido').value.trim();

  const blancos = obtenerJugadores('Blanco');
  const negros = obtenerJugadores('Negro');

  if (blancos.length < 5 || negros.length < 5) {
    return alert('Debes seleccionar 5 jugadores por equipo');
  }

  const jugadores = [...blancos, ...negros].map(j => ({
    ...j, torneo, fecha, partido,
    flageado: 1,
    llego_tarde: j.llegoTarde ? 1 : 0,
    minutos_tarde: j.minutosTarde || 0
  }));

  const idFigura = document.getElementById('selectFigura').value;
  const figura = jugadores.find(j => j.jugador === idFigura);
  const formacion = {
    fecha_partido: fecha,
    nombre_partido: partido,
    votante: 'web',
    figura_votada: 'voto manual',
    id_jugador_votado: figura ? figura.id : ''
  };

  const nuevoJugador = jugadores.find(j => j.nuevo === true) || null;

  try {
    await fetch(WEBHOOK_PARTIDO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugadores,
        formacion,
        nuevoJugador
      })
    });
    alert('Partido y figura cargados correctamente');
    document.getElementById('formPartido').reset();
    document.querySelector('.equipos-grid').style.display = 'none';
  } catch (err) {
    console.error('Error enviando datos:', err);
    alert('Error al enviar los datos');
  }
});

