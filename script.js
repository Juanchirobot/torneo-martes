// script.js parcial actualizado para soporte de pestañas + carga de Google Sheets + gráficos

const urlCSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTTU-REEMPLAZAR-TU-LINK/pub?gid=0&single=true&output=csv';

function mostrarTab(tabId) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}

async function cargarDatosDesdeCSV() {
  try {
    const response = await fetch(urlCSV);
    const text = await response.text();
    const rows = text.trim().split('\n').slice(1);
    const data = rows.map(row => row.split(','));

    // Parse básico de datos relevantes
    const fechas = {}; // acumulador goles por mes
    const jugadores = {}; // acumulador goles por jugador

    data.forEach(([nombre_torneo, fecha_inicio_torneo, fecha_partido, nombre_partido, jugador_nombre, id_jugador, equipo, goles_partido, flageado]) => {
      const fecha = new Date(fecha_partido);
      const mes = fecha.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      const goles = parseInt(goles_partido);

      if (!fechas[mes]) fechas[mes] = 0;
      fechas[mes] += goles;

      if (!jugadores[jugador_nombre]) jugadores[jugador_nombre] = 0;
      jugadores[jugador_nombre] += goles;
    });

    renderizarGraficos(fechas, jugadores);
  } catch (err) {
    console.error('Error al cargar datos de Google Sheets', err);
  }
}

function renderizarGraficos(golesMes, golesJugadores) {
  const ctxMes = document.getElementById('graficoGolesPorMes').getContext('2d');
  new Chart(ctxMes, {
    type: 'bar',
    data: {
      labels: Object.keys(golesMes),
      datasets: [{
        label: 'Goles por mes',
        data: Object.values(golesMes),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Goles por mes' }
      }
    }
  });

  const ctxJug = document.getElementById('graficoRendimientoJugadores').getContext('2d');
  new Chart(ctxJug, {
    type: 'bar',
    data: {
      labels: Object.keys(golesJugadores),
      datasets: [{
        label: 'Goles por jugador',
        data: Object.values(golesJugadores),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Goles por jugador' }
      }
    }
  });
}

// Ejecutar al inicio para la pestaña estadísticas
if (location.pathname.includes('index.html') || location.pathname.endsWith('/')) {
  window.addEventListener('DOMContentLoaded', () => {
    mostrarTab('partidos');
    cargarDatosDesdeCSV();
  });
}
