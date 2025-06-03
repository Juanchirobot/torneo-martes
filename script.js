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
  cerrarModal();
  e.target.reset();
});
