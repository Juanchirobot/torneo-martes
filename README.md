# Torneo de Amigos

Esta web permite registrar partidos y ver estadísticas. Incluye un webhook que recibe los votos de la figura del partido mediante WhatsApp.

## Requisitos
- Node.js 18+
- Cuenta de Twilio con acceso a la API de WhatsApp
- Instancia de n8n
- Proyecto en Google Cloud con la API de Google Sheets habilitada
- Hoja de cálculo con las pestañas `Jugadores`, `Partidos`, `Formacion` y `Votos`
- ngrok para exponer el servidor local

## Instalación
1. Clona este repositorio y ejecuta:
   ```bash
   npm install
   ```
2. Exporta las variables de entorno o crea un archivo `.env`:
   - `N8N_WEBHOOK_URL`: URL del webhook de n8n donde se registrarán los votos.
   - `PORT`: puerto para el servidor (por defecto 3000).
3. Inicia el servidor que gestiona el webhook de Twilio:
   ```bash
   node server.js
   ```
4. Para visualizar la web ejecuta un servidor estático desde la raíz del proyecto, por ejemplo:
   ```bash
   npx http-server .
   ```
   Luego abre `http://localhost:8080` en el navegador.

## Configuración de Google Sheets
1. Crea una hoja en Google Drive con las pestañas `Jugadores`, `Partidos`, `Formacion` y `Votos`.
2. En Google Cloud Console crea un proyecto, habilita **Google Sheets API** y genera una clave de API.
3. Comparte la hoja como pública o con el proyecto para que la API pueda leerla.
4. Edita `script.js` y reemplaza las constantes `SHEET_ID` y `API_KEY` por tus valores.

## Configuración de Twilio y ngrok
1. Obtén un número de Twilio con capacidad de WhatsApp o utiliza la sandbox.
2. Ejecuta ngrok para exponer tu servidor local: `ngrok http PORT` (cambia `PORT` por el valor configurado).
3. En Twilio configura la URL `https://TU_SUBDOMINIO_NGROK/webhook` como webhook de mensajes entrantes.
4. Cuando Twilio reciba un mensaje se enviará a tu servidor, el cual lo reenviará a `N8N_WEBHOOK_URL` y responderá al usuario.

## Flujo en n8n
1. Crea un nodo **Webhook** (método `POST`) y copia la URL generada; colócala en `N8N_WEBHOOK_URL`.
2. Añade un nodo **Google Sheets** con la operación **Append** para escribir en la pestaña `Votos`.
3. Incluye nodos adicionales para validar o procesar la información según sea necesario.
4. Activa el flujo y prueba enviando un WhatsApp al número configurado en Twilio.

La web (`index.html` y `script.js`) leerá los datos de tu hoja de cálculo. Si no ves información, verifica que `SHEET_ID` y `API_KEY` estén configurados y que la hoja tenga permisos de lectura para la API.
