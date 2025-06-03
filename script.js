// 📌 Configuración inicial y variables globales
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbygwgG_nPBsEHLPnkhMV0xK0V-BKsbWXzxIIo2ikuXFaUEUKvGOLFC5b68Ui6HDjoegSQ/exec";

let datosPartidos = [];
let jugadoresLista = [];
let mapaJugadores = {};
let contadorID = 1;
let nuevosJugadores = [];

// 📌 Utilidades DOM
function mostrarTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
  document.getElementById(id).style.display = "block";
}

function abrirModalFormulario() {
  document.getElementById("modalFormulario").style.display = "block";
  document.getElementById("overlay").style.display = "block";
  document.getElementById("tablaBlanco").innerHTML = "";
  document.getElementById("tablaNegro").innerHTML = "";
  for (let i = 0; i < 3; i++) {
    agregarFila("Blanco");
    agregarFila("Negro");
  }
}

function cerrarModal() {
  document.getElementById("modalFormulario").style.display = "none";
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function abrirAgregarJugador() {
  document.getElementById("modalJugador").style.display = "block";
  document.getElementById("overlay").style.display = "block";
}

function cerrarModalJugador() {
  document.getElementById("modalJugador").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function celda(content) {
  const td = document.createElement("td");
  td.appendChild(content);
  return td;
}

// 📌 Agregar jugador nuevo

document.getElementById("formJugador").addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre || mapaJugadores[nombre]) {
    alert("Jugador inválido o ya existe.");
    return;
  }

  const fechaAlta = new Date().toISOString().split("T")[0];
  const nuevoID = contadorID++;

  const jugador = {
    id_jugador: nuevoID,
    jugador_nombre: nombre,
    fecha_alta: fechaAlta
  };

  mapaJugadores[nombre] = nuevoID;
  jugadoresLista.push(jugador);
  nuevosJugadores.push(jugador);
  await enviarAGoogleSheets("jugadores", jugador);

  alert(`Jugador ${nombre} agregado con ID ${nuevoID}`);
  cerrarModalJugador();
  e.target.reset();
});

// 📌 Agregar fila en equipo
function agregarFila(equipo) {
  const tbody = document.getElementById("tabla" + equipo);
  if (tbody.querySelectorAll("tr").length >= 5) {
    alert("Máximo 5 jugadores por equipo.");
    return;
  }

  const fila = document.createElement("tr");

  const select = document.createElement("select");
  jugadoresLista.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j.jugador_nombre;
    opt.textContent = j.jugador_nombre;
    select.appendChild(opt);
  });

  const golesInput = document.createElement("input");
  golesInput.type = "number";
  golesInput.min = 0;
  golesInput.value = 0;
  golesInput.required = true;

  const checkboxTarde = document.createElement("input");
  checkboxTarde.type = "checkbox";
  checkboxTarde.title = "¿Llegó tarde?";

  const eliminarBtn = document.createElement("button");
  eliminarBtn.textContent = "❌";
  eliminarBtn.type = "button";
  eliminarBtn.className = "btn secundario";
  eliminarBtn.onclick = () => fila.remove();

  fila.appendChild(celda(select));
  fila.appendChild(celda(golesInput));
  fila.appendChild(celda(checkboxTarde));
  fila.appendChild(celda(eliminarBtn));

  tbody.appendChild(fila);
}

// 📌 Envío a Google Sheets
async function enviarAGoogleSheets(sheetName, data) {
  try {
    const url = `${URL_GOOGLE_SHEETS}?sheet=${sheetName}`;
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    const texto = await res.text();
    console.log(`✅ [${sheetName}] ->`, texto);
  } catch (err) {
    console.error(`❌ Error al enviar a ${sheetName}:`, err);
  }
}

async function enviarPartidoAGoogleSheets(partidos) {
  for (let p of partidos) {
    await enviarAGoogleSheets("partidos", p);
  }
}

// 📌 Envío de formulario de partido

document.getElementById("formPartido").addEventListener("submit", async e => {
  e.preventDefault();

  const torneo = document.getElementById("nombre_torneo").value;
  const fecha = document.getElementById("fecha_partido").value;
  const partido = document.getElementById("nombre_partido").value;

  const nuevos = [];

  ["Blanco", "Negro"].forEach(equipo => {
    const filas = document.querySelectorAll(`#tabla${equipo} tr`);
    filas.forEach(fila => {
      const nombre = fila.querySelector("select").value;
      const goles = parseInt(fila.querySelector("input[type=number]").value);
      const id = mapaJugadores[nombre];
      const llegoTarde = fila.querySelector("input[type=checkbox]")?.checked ? 1 : 0;

      nuevos.push({
        nombre_torneo: torneo,
        fecha_inicio_torneo: fecha,
        fecha_partido: fecha,
        nombre_partido: partido,
        jugador_nombre: nombre,
        id_jugador: id,
        equipo,
        goles_partido: goles,
        flageado: 1,
        llego_tarde: llegoTarde,
        minutos_tarde: llegoTarde ? 10 : 0,
        voto_figura: ""
      });
    });
  });

  datosPartidos = datosPartidos.concat(nuevos);
  if (nuevosJugadores.length > 0) nuevosJugadores.forEach(j => enviarAGoogleSheets("jugadores", j));
  await enviarPartidoAGoogleSheets(nuevos);
  procesarDatos();
  cerrarModal();
  e.target.reset();
});

// 📌 Procesamiento y visualización
function procesarDatos() {
  const posiciones = {};
  const historial = [];
  const actividad = {};
  const partidosSet = new Set();
  const partidosPorFecha = {};

  datosPartidos.forEach(d => {
    if (!d || !d.fecha_partido || !d.nombre_partido) return;
    const clave = `${d.fecha_partido}-${d.nombre_partido}`;
    if (!partidosPorFecha[clave]) partidosPorFecha[clave] = [];
    partidosPorFecha[clave].push(d);
    partidosSet.add(`${d.nombre_torneo}||${d.fecha_partido}`);
  });

  const clavesOrdenadas = Object.keys(partidosPorFecha).sort().reverse();
  const ultimosHTML = clavesOrdenadas.slice(0, 5).map(clave => {
    const jugadores = partidosPorFecha[clave];
    const torneo = jugadores[0]?.nombre_torneo || "Torneo";
    const equipos = { Blanco: [], Negro: [] };
    let golesBlanco = 0, golesNegro = 0;

    jugadores.forEach(j => {
      equipos[j.equipo].push(`${j.jugador_nombre} (${j.goles_partido})`);
      if (j.equipo === 'Blanco') golesBlanco += j.goles_partido;
      else golesNegro += j.goles_partido;
    });

    const goleador = jugadores.reduce((a, b) => (a.goles_partido > b.goles_partido ? a : b));
    return `
      <div>
        <strong>${torneo} - ${clave}</strong><br/>
        Blanco ${golesBlanco} vs ${golesNegro} Negro<br/>
        🥇 Goleador: ${goleador.jugador_nombre} (${goleador.goles_partido})<br/>
      </div>
    `;
  });

  document.getElementById("ultimosPartidos").innerHTML = ultimosHTML.join("");

  Object.values(partidosPorFecha).forEach(jugadores => {
    const golesPorEquipo = {};
    jugadores.forEach(j => {
      golesPorEquipo[j.equipo] = (golesPorEquipo[j.equipo] || 0) + j.goles_partido;
    });

    const equipos = Object.keys(golesPorEquipo);
    let resultado;
    if (golesPorEquipo[equipos[0]] > golesPorEquipo[equipos[1]]) resultado = equipos[0];
    else if (golesPorEquipo[equipos[0]] < golesPorEquipo[equipos[1]]) resultado = equipos[1];
    else resultado = "empate";

    const maxGoles = Math.max(...jugadores.map(j => j.goles_partido));
    const goleadores = jugadores.filter(j => j.goles_partido === maxGoles && maxGoles > 0);

    jugadores.forEach(j => {
      const id = j.id_jugador;
      if (!posiciones[id]) posiciones[id] = { nombre: j.jugador_nombre, puntos: 0, goles: 0, partidos: 0 };
      if (!actividad[id]) actividad[id] = { nombre: j.jugador_nombre, presencia: 0 };

      posiciones[id].goles += j.goles_partido;
      posiciones[id].partidos += 1;
      actividad[id].presencia += j.flageado;

      if (resultado !== "empate" && j.equipo === resultado) posiciones[id].puntos += 3;
      else if (resultado === "empate") posiciones[id].puntos += 1;

      if (j.llego_tarde) posiciones[id].puntos -= 1;

      historial.push(j);
    });
  });

  actualizarTabla("tablaPosiciones", posiciones, ["nombre", "puntos", "goles", "partidos"]);
  actualizarTabla("tablaGoleadores", posiciones, ["nombre", "goles"]);
  actualizarTablaTitulares(actividad, partidosSet.size);
  actualizarHistorial(historial);
}

function actualizarTabla(id, datos, campos) {
  const tbody = document.getElementById(id);
  tbody.innerHTML = "";
  Object.values(datos)
    .sort((a, b) => (b.puntos ?? b.presencia ?? 0) - (a.puntos ?? a.presencia ?? 0))
    .forEach(d => {
      const fila = campos.map(c => `<td>${d[c]}</td>`).join("");
      tbody.innerHTML += `<tr>${fila}</tr>`;
    });
}

function actualizarTablaTitulares(actividad, totalFechas) {
  const tbody = document.getElementById("tablaTitulares");
  tbody.innerHTML = "";
  Object.values(actividad)
    .sort((a, b) => b.presencia - a.presencia)
    .forEach(j => {
      const porcentaje = Math.min((j.presencia / totalFechas) * 100, 100).toFixed(0);
      tbody.innerHTML += `<tr><td>${j.nombre}</td><td>${j.presencia}</td><td>${porcentaje}%</td></tr>`;
    });
}

function actualizarHistorial(filas) {
  const tbody = document.getElementById("tablaHistorial");
  tbody.innerHTML = "";
  filas.forEach(d => {
    tbody.innerHTML += `<tr><td>${d.fecha_partido}</td><td>${d.nombre_partido}</td><td>${d.jugador_nombre}</td><td>${d.equipo}</td><td>${d.goles_partido}</td></tr>`;
  });
}
