let datosPartidos = [];
let jugadoresLista = [];
let mapaJugadores = {};
let contadorID = 1;
let nuevosJugadores = [];

let graficoGoles = null;
let graficoRendimiento = null;

const SHEET_ID = "<SHEET_ID>";
const API_KEY = "<API_KEY>";

function mostrarTab(id) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.style.display = "none";
    tab.style.opacity = 0;
    tab.style.transform = "translateY(20px)";
  });
  const tab = document.getElementById(id);
  tab.style.display = "block";
  setTimeout(() => {
    tab.style.opacity = 1;
    tab.style.transform = "translateY(0)";
  }, 0);
  if (id === "formulario") cargarFormacionPrevia();
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
// Agregar nuevo jugador con fecha automática
document.getElementById("formJugador").addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nuevoJugador").value.trim();
  if (!nombre || mapaJugadores[nombre]) {
    alert("Jugador inválido o ya existe.");
    return;
  }

  const fechaAlta = new Date().toISOString().split("T")[0];
  const nuevoID = contadorID++;

  mapaJugadores[nombre] = nuevoID;
  jugadoresLista.push({ id: nuevoID, jugador_nombre: nombre, fecha_alta: fechaAlta });
  nuevosJugadores.push({ id: nuevoID, jugador_nombre: nombre, fecha_alta: fechaAlta });

  alert(`Jugador ${nombre} agregado con ID ${nuevoID}`);
  cerrarModalJugador();
  e.target.reset();
});

// Agregar fila con botón para eliminar y máximo de 5
function agregarFila(equipo, nombrePreseleccionado = "") {
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
  if (nombrePreseleccionado) {
    const existe = jugadoresLista.some(j => j.jugador_nombre === nombrePreseleccionado);
    if (!existe) {
      const opt = document.createElement("option");
      opt.value = nombrePreseleccionado;
      opt.textContent = nombrePreseleccionado;
      select.appendChild(opt);
    }
    select.value = nombrePreseleccionado;
  }

  const golesInput = document.createElement("input");
  golesInput.type = "number";
  golesInput.min = 0;
  golesInput.value = 0;
  golesInput.required = true;

  const eliminarBtn = document.createElement("button");
  eliminarBtn.textContent = "❌";
  eliminarBtn.type = "button";
  eliminarBtn.className = "btn secundario";
  eliminarBtn.onclick = () => fila.remove();

  const celdaNombre = document.createElement("td");
  const celdaGoles = document.createElement("td");
  const celdaBorrar = document.createElement("td");

  celdaNombre.appendChild(select);
  celdaGoles.appendChild(golesInput);
  celdaBorrar.appendChild(eliminarBtn);

  fila.appendChild(celdaNombre);
  fila.appendChild(celdaGoles);
  fila.appendChild(celdaBorrar);

  tbody.appendChild(fila);
}
// Guardar partido y descargar archivos
document.getElementById("formPartido").addEventListener("submit", e => {
  e.preventDefault();

  const torneo = document.getElementById("nombre_torneo").value;
  const fecha = document.getElementById("fecha_partido").value;
  const partido = document.getElementById("nombre_partido").value;

  const nuevos = [];

  ["Blanco", "Negro"].forEach(equipo => {
    const filas = document.querySelectorAll(`#tabla${equipo} tr`);
    filas.forEach(fila => {
      const nombre = fila.querySelector("select").value;
      const goles = parseInt(fila.querySelector("input").value);
      const id = mapaJugadores[nombre];

      nuevos.push({
        nombre_torneo: torneo,
        fecha_inicio_torneo: fecha,
        fecha_partido: fecha,
        nombre_partido: partido,
        jugador_nombre: nombre,
        id_jugador: id,
        equipo,
        goles_partido: goles,
        flageado: 1
      });
    });
  });

  datosPartidos = datosPartidos.concat(nuevos);
  procesarDatos();
  descargarCSV();
  if (nuevosJugadores.length > 0) descargarJugadoresCSV();
  cerrarModal();
  e.target.reset();
});

// Descargar resultados
function descargarCSV() {
  const headers = ["nombre_torneo","fecha_inicio_torneo","fecha_partido","nombre_partido","jugador_nombre","id_jugador","equipo","goles_partido","flageado"];
  const filas = datosPartidos.map(d => headers.map(h => d[h]).join(","));
  const contenido = [headers.join(","), ...filas].join("\n");
  const blob = new Blob([contenido], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resultados.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Descargar nuevos jugadores
function descargarJugadoresCSV() {
  const headers = ["id_jugador", "jugador_nombre", "fecha_alta"];
  const filas = nuevosJugadores.map(j => headers.map(h => j[h]).join(","));
  const contenido = [headers.join(","), ...filas].join("\n");
  const blob = new Blob([contenido], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jugadores_nuevos.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
function procesarDatos() {
  const posiciones = {};
  const historial = [];
  const actividad = {};
  const golesMes = {};
  const partidosSet = new Set();
  const partidosPorFecha = {};

  datosPartidos.forEach(d => {
    if (!d || !d.fecha_partido || !d.nombre_partido) return;
    const clave = `${d.fecha_partido}-${d.nombre_partido}`;
    if (!partidosPorFecha[clave]) partidosPorFecha[clave] = [];
    partidosPorFecha[clave].push(d);
    partidosSet.add(`${d.nombre_torneo}||${d.fecha_partido}`);
    const mes = d.fecha_partido.slice(0,7);
    golesMes[mes] = (golesMes[mes] || 0) + d.goles_partido;
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
      <div class="card fade-in-up">
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

      if (goleadores.some(g => g.id_jugador === j.id_jugador)) posiciones[id].puntos += 1;

      historial.push(j);
    });
  });

  actualizarTabla("tablaPosiciones", posiciones, ["nombre", "puntos", "goles", "partidos"]);
  actualizarTabla("tablaGoleadores", posiciones, ["nombre", "goles"]);
  actualizarTablaTitulares(actividad, partidosSet.size);
  actualizarHistorial(historial);
  renderGraficos(golesMes, posiciones);
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

function renderGraficos(golesMes, posiciones) {
  const ctx1 = document.getElementById('graficoGolesPorMes').getContext('2d');
  const labels1 = Object.keys(golesMes).sort();
  const data1 = labels1.map(m => golesMes[m]);
  if (graficoGoles) graficoGoles.destroy();
  graficoGoles = new Chart(ctx1, {
    type: 'bar',
    data: { labels: labels1, datasets: [{ label: 'Goles', data: data1, backgroundColor: '#008080' }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const ctx2 = document.getElementById('graficoRendimientoJugadores').getContext('2d');
  const top = Object.values(posiciones).sort((a,b) => b.puntos - a.puntos).slice(0,5);
  const labels2 = top.map(t => t.nombre);
  const data2 = top.map(t => t.puntos);
  if (graficoRendimiento) graficoRendimiento.destroy();
  graficoRendimiento = new Chart(ctx2, {
    type: 'radar',
    data: { labels: labels2, datasets: [{ label: 'Puntos', data: data2, backgroundColor: 'rgba(0,128,128,0.4)', borderColor: '#008080' }] },
    options: { responsive: true, scales: { r: { beginAtZero: true } } }
  });
}



// Ejecutar al cargar la web


// Cargar datos desde Google Sheets
async function cargarJugadoresDesdeSheets() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Jugadores?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const { values } = await res.json();
    jugadoresLista = (values || []).slice(1).map(([id, nombre, fecha]) => {
      const idNum = parseInt(id);
      mapaJugadores[nombre] = idNum;
      if (idNum >= contadorID) contadorID = idNum + 1;
      return { id: idNum, jugador_nombre: nombre, fecha_alta: fecha };
    });
  } catch (err) {
    console.error('Error al cargar jugadores (Sheets):', err);
  }
}

async function cargarPartidosDesdeSheets() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Partidos?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const { values } = await res.json();
    (values || []).slice(1).forEach(row => {
      const [nombre_torneo, fecha_inicio_torneo, fecha_partido, nombre_partido, jugador_nombre, id_jugador, equipo, goles_partido, flageado] = row;
      datosPartidos.push({
        nombre_torneo,
        fecha_inicio_torneo,
        fecha_partido,
        nombre_partido,
        jugador_nombre,
        id_jugador: parseInt(id_jugador),
        equipo,
        goles_partido: parseInt(goles_partido),
        flageado: parseInt(flageado)
      });
    });
    procesarDatos();
  } catch (err) {
    console.error('Error al cargar partidos (Sheets):', err);
  }
}

async function cargarFormacionDesdeSheets() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Formacion?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const { values } = await res.json();
    const blanco = [], negro = [];
    (values || []).slice(1).forEach(row => {
      if (row[0]) blanco.push(row[0]);
      if (row[1]) negro.push(row[1]);
    });
    return { Blanco: blanco, Negro: negro };
  } catch (err) {
    console.error('Error al cargar formación (Sheets):', err);
    return { Blanco: [], Negro: [] };
  }
}

async function cargarFormacionPrevia() {
  const formacion = await cargarFormacionDesdeSheets();
  document.getElementById("tablaBlanco").innerHTML = "";
  document.getElementById("tablaNegro").innerHTML = "";
  formacion.Blanco.forEach(n => agregarFila("Blanco", n));
  formacion.Negro.forEach(n => agregarFila("Negro", n));
}

// Ejecutar al cargar la web desde Sheets
(async () => {
  await cargarJugadoresDesdeSheets();
  await cargarPartidosDesdeSheets();
})();


