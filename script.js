let datosPartidos = [];
let jugadoresLista = [];
let mapaJugadores = {};
let contadorID = 1;

function mostrarTab(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
  document.getElementById(id).style.display = "block";
}

function abrirModalFormulario() {
  document.getElementById("modalFormulario").style.display = "block";
  document.getElementById("overlay").style.display = "block";
  document.getElementById("tablaBlanco").innerHTML = "";
  document.getElementById("tablaNegro").innerHTML = "";
  agregarFila("Blanco");
  agregarFila("Negro");
}

function cerrarModal() {
  document.getElementById("modalFormulario").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function agregarFila(equipo) {
  const tbody = document.getElementById("tabla" + equipo);
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

  const celdaNombre = document.createElement("td");
  celdaNombre.appendChild(select);

  const celdaGoles = document.createElement("td");
  celdaGoles.appendChild(golesInput);

  fila.appendChild(celdaNombre);
  fila.appendChild(celdaGoles);

  tbody.appendChild(fila);
}

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

      if (!mapaJugadores[nombre]) {
        mapaJugadores[nombre] = contadorID++;
      }

      nuevos.push({
        nombre_torneo: torneo,
        fecha_inicio_torneo: fecha,
        fecha_partido: fecha,
        nombre_partido: partido,
        jugador_nombre: nombre,
        id_jugador: mapaJugadores[nombre],
        equipo: equipo,
        goles_partido: goles,
        flageado: 1
      });
    });
  });

  datosPartidos = datosPartidos.concat(nuevos);
  procesarDatos();
  descargarCSV();
  cerrarModal();
  e.target.reset();
});

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

async function cargarJugadoresDesdeGitHub() {
  const url = 'https://raw.githubusercontent.com/Juanchirobot/torneo-martes/main/jugadores.csv';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1);
    jugadoresLista = rows.map(row => {
      const [id, nombre] = row.split(",");
      mapaJugadores[nombre] = parseInt(id);
      if (parseInt(id) >= contadorID) contadorID = parseInt(id) + 1;
      return { id: parseInt(id), jugador_nombre: nombre };
    });
  } catch (err) {
    alert("Error al cargar jugadores desde GitHub");
    console.error(err);
  }
}

async function cargarCSVDesdeGitHub() {
  const url = 'https://raw.githubusercontent.com/Juanchirobot/torneo-martes/main/resultados.csv';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1);

    rows.forEach(linea => {
      const [nombre_torneo, fecha_inicio_torneo, fecha_partido, nombre_partido, jugador_nombre, id_jugador, equipo, goles_partido, flageado] = linea.split(",");

      const id = parseInt(id_jugador);
      mapaJugadores[jugador_nombre] = id;
      if (id >= contadorID) contadorID = id + 1;

      datosPartidos.push({
        nombre_torneo,
        fecha_inicio_torneo,
        fecha_partido,
        nombre_partido,
        jugador_nombre,
        id_jugador: id,
        equipo,
        goles_partido: parseInt(goles_partido),
        flageado: parseInt(flageado)
      });
    });

    procesarDatos();
  } catch (err) {
    console.error("Error al cargar resultados:", err);
  }
}

function procesarDatos() {
  const posiciones = {};
  const historial = [];
  const actividad = {};
  const partidosSet = new Set();

  const partidosPorFecha = {};

  datosPartidos.forEach(d => {
    const clave = `${d.fecha_partido}-${d.nombre_partido}`;
    if (!partidosPorFecha[clave]) partidosPorFecha[clave] = [];
    partidosPorFecha[clave].push(d);
    partidosSet.add(clave);
  });

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
      if (!posiciones[id]) {
        posiciones[id] = { nombre: j.jugador_nombre, puntos: 0, goles: 0, partidos: 0 };
      }
      if (!actividad[id]) {
        actividad[id] = { nombre: j.jugador_nombre, presencia: 0 };
      }

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
      const porcentaje = ((j.presencia / totalFechas) * 100).toFixed(0);
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

(async () => {
  await cargarJugadoresDesdeGitHub();
  await cargarCSVDesdeGitHub();
})();
