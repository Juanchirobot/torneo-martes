const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";
const WEBHOOK_PARTIDO_URL = "https://juanchi.app.n8n.cloud/webhook/cargar-partido";

let jugadores = [];
let partidos = [];
let formaciones = [];
let chartJugadores;

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
      id: parseInt(id), nombre, tel
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
    }));

    formaciones = formData.values.slice(1).map(([fecha, nombrePartido, votante, figura, idFigura]) => ({
      fecha_partido: fecha,
      nombre_partido: nombrePartido,
      figura_votada: figura,
      id_jugador_votado: parseInt(idFigura)
    }));

  } catch (err) {
    console.error("❌ Error cargando datos:", err);
  }
}
function renderizarFormulario() {
  const equipoBlanco = document.getElementById("equipoBlanco");
  const equipoNegro = document.getElementById("equipoNegro");
  const selectFigura = document.getElementById("selectFigura");

  equipoBlanco.innerHTML = "";
  equipoNegro.innerHTML = "";
  selectFigura.innerHTML = `<option disabled selected>Selecciona figura</option>`;

  jugadores.forEach(j => {
    const fila = document.createElement("div");
    fila.className = "filaJugador";
    fila.innerHTML = `
      <span>${j.nombre}</span>
      <input type="number" class="inputGoles" placeholder="Goles" data-id="${j.id}" />
      <input type="number" class="inputMinTarde" placeholder="Min Tarde" data-id="${j.id}" />
    `;

    selectFigura.innerHTML += `<option value="${j.nombre}">${j.nombre}</option>`;

    // Reparto alternado blanco/negro por ID
    if (j.id % 2 === 0) equipoBlanco.appendChild(fila);
    else equipoNegro.appendChild(fila);
  });

  document.querySelector(".equipos-grid").style.display = "grid";
}

// Funciones de manejo de modales
function cerrarTodosLosModales() {
  const modales = document.querySelectorAll('.modal');
  const overlay = document.getElementById('overlay');
  
  modales.forEach(modal => {
    modal.style.display = 'none';
  });
  
  overlay.style.display = 'none';
}

function abrirModalFormulario() {
  const modal = document.getElementById("modalFormulario");
  const overlay = document.getElementById("overlay");
  
  overlay.style.display = "block";
  modal.style.display = "flex";
  renderizarFormulario();
}

function cerrarModalFormulario() {
  const modal = document.getElementById("modalFormulario");
  const overlay = document.getElementById("overlay");
  
  modal.style.display = "none";
  overlay.style.display = "none";
  document.getElementById("formPartido").reset();
  document.querySelector(".equipos-grid").style.display = "none";
}

function abrirModalJugador() {
  const modal = document.getElementById("modalJugador");
  const overlay = document.getElementById("overlay");
  
  overlay.style.display = "block";
  modal.style.display = "flex";
}

function cerrarModalJugador() {
  const modal = document.getElementById("modalJugador");
  const overlay = document.getElementById("overlay");
  
  modal.style.display = "none";
  overlay.style.display = "none";
  document.getElementById("formJugador").reset();
}

function cerrarModalDetalle() {
  const modal = document.getElementById("modalDetallePartido");
  const overlay = document.getElementById("overlay");
  
  modal.style.display = "none";
  overlay.style.display = "none";
}

function cerrarModalGeneral() {
  const modal = document.getElementById("modalGeneral");
  const overlay = document.getElementById("overlay");
  
  modal.style.display = "none";
  overlay.style.display = "none";
}

function obtenerDatosFormulario() {
  const torneo = document.getElementById("nombre_torneo").value.trim();
  const fecha_inicio_torneo = document.getElementById("fecha_inicio_torneo").value.trim();
  const fecha_partido = document.getElementById("fecha_partido").value.trim();
  const nombre_partido = document.getElementById("nombre_partido").value.trim();
  const figura_nombre = document.getElementById("selectFigura").value.trim();

  const inputsGoles = document.querySelectorAll(".inputGoles");
  const inputsMinTarde = document.querySelectorAll(".inputMinTarde");

  const jugadoresDatos = [];

  inputsGoles.forEach((input, index) => {
    const id = parseInt(input.dataset.id);
    const jugador = jugadores.find(j => j.id === id);
    if (!jugador) return;

    const goles = parseInt(input.value) || 0;
    const minutosTarde = parseInt(inputsMinTarde[index].value) || 0;
    const llegoTarde = minutosTarde > 0 ? 1 : 0;

    jugadoresDatos.push({
      torneo,
      fecha_inicio_torneo,
      fecha_partido,
      nombre_partido,
      jugador_nombre: jugador.nombre,
      id_jugador: jugador.id,
      tel: jugador.tel,
      goles_partido: goles,
      equipo: jugador.id % 2 === 0 ? "Blanco" : "Negro",
      flageado: 1,
      llego_tarde: llegoTarde,
      minutos_tarde: minutosTarde
    });
  });

  const idFigura = jugadores.find(j => j.nombre === figura_nombre)?.id || null;

  return {
    jugadores: jugadoresDatos,
    formacion: [{
      fecha_partido,
      nombre_partido,
      votante: "web",
      figura_votada: "voto manual",
      id_jugador_votado: idFigura
    }]
  };
}
// 📨 Enviar datos al webhook
async function enviarPartido() {
  const { jugadores, formacion } = obtenerDatosFormulario();

  const mensajeWhatsApp = jugadores.map(j => ({
    nombre: j.jugador_nombre,
    telefono: j.tel,
    mensaje: `📢 ¡Hola ${j.jugador_nombre}! Se cargó el partido "${j.nombre_partido}" del torneo ${j.torneo} (${j.fecha_partido}).\nPodés ver tus estadísticas y votar a la figura. Recordá que si no votás en 24 horas, se te resta 1 punto.`
  }));

  const payload = {
    jugadores,
    formacion,
    mensajeWhatsApp
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
}
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
    opt.value = j.jugador_nombre || j.jugador;
    opt.textContent = j.jugador_nombre || j.jugador;
    select.appendChild(opt);
  });

  select.style.display = "block";
}

// 🎛 Filtro de partidos por mes
function filtrarPartidosPorMes() {
  const anio = document.getElementById("selectAnio").value;
  const mes = document.getElementById("selectMes").value;
  const contenedor = document.getElementById("partidosFiltrados");
  contenedor.innerHTML = "";

  const partidosAgrupados = {};

  partidos.forEach(p => {
    const fecha = new Date(p.fecha_partido);
    const fechaMes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anioStr = fecha.getFullYear();

    if (fechaMes === mes && String(anioStr) === anio) {
      const clave = `${p.fecha_partido}__${p.nombre_partido}`;
      if (!partidosAgrupados[clave]) partidosAgrupados[clave] = [];
      partidosAgrupados[clave].push(p);
    }
  });
  Object.entries(partidosAgrupados).forEach(([clave, jugadores]) => {
    const [fecha, nombre_partido] = clave.split("__");
    const torneo = jugadores[0].torneo;
    const golesBlanco = jugadores.filter(j => j.equipo === "Blanco").reduce((acc, j) => acc + j.goles, 0);
    const golesNegro = jugadores.filter(j => j.equipo === "Negro").reduce((acc, j) => acc + j.goles, 0);

    const div = document.createElement("div");
    div.className = "cardPartidoCompacto";
    div.innerHTML = `
      <strong>${torneo}</strong><br/>
      ${nombre_partido} (${fecha})<br/>
      ⚪ ${golesBlanco} - ${golesNegro} ⚫
    `;
    div.onclick = () => mostrarDetallePartido(jugadores);
    contenedor.appendChild(div);
  });

  // Oculta la sección de últimos partidos al filtrar
  document.getElementById("ultimosPartidos").style.display = "none";
  // Muestra resultados filtrados
  contenedor.style.display = "flex";
}
function mostrarDetallePartido(jugadores) {
  if (!jugadores || jugadores.length === 0) return;

  const { torneo, fecha_partido, nombre_partido } = jugadores[0];

  const blanco = jugadores.filter(j => j.equipo === "Blanco");
  const negro = jugadores.filter(j => j.equipo === "Negro");

  const golesBlanco = blanco.reduce((acc, j) => acc + j.goles, 0);
  const golesNegro = negro.reduce((acc, j) => acc + j.goles, 0);

  const puntajes = calcularPuntos();
  const goleador = jugadores.reduce((max, j) => j.goles > (max?.goles || 0) ? j : max, null);

  const figuraData = formaciones.find(f =>
    f.fecha_partido === fecha_partido &&
    f.nombre_partido === nombre_partido
  );

  const figura = jugadores.find(j => j.id_jugador === figuraData?.id_jugador_votado)?.jugador || "-";

  const tablaEquipo = (lista, equipo) => `
    <h3>${equipo === "Blanco" ? "⚪ Blanco" : "⚫ Negro"}</h3>
    <table>
      <thead><tr><th>Jugador</th><th>Goles</th><th>Puntos</th></tr></thead>
      <tbody>
        ${lista.map(j => {
          const puntosJugador = puntajes[j.jugador]?.puntos || 0;
          return `<tr>
            <td>${j.jugador}</td>
            <td>${j.goles}</td>
            <td style="color:${puntosJugador < 0 ? 'red' : 'inherit'}">${puntosJugador}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
  const modal = document.getElementById("modalDetallePartido");
  const contenido = document.getElementById("contenidoModalDetalle");
  contenido.innerHTML = `
    <span class="close" onclick="cerrarModalDetalle()">&times;</span>
    <h2>${torneo}</h2>
    <p>${nombre_partido} - ${fecha_partido}</p>
    ${tablaEquipo(blanco, "Blanco")}
    ${tablaEquipo(negro, "Negro")}
    <p><strong>🥅 Goleador:</strong> ${goleador?.jugador || "-"} (${goleador?.goles || 0} goles)</p>
    <p><strong>⭐ Figura:</strong> ${figura}</p>
  `;
  modal.style.display = "flex";
}
