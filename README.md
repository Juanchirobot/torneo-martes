# Torneo de Amigos

Este proyecto es una web para registrar partidos, jugadores y estadísticas. A continuación se describe cómo integrar la votación de la figura del partido vía WhatsApp utilizando Twilio y cómo procesar esos votos con un flujo en n8n.

## Requisitos
- Node.js 18+
- Cuenta de Twilio con acceso a la API de WhatsApp
- Instancia de n8n
- Una hoja de cálculo de Google con las pestañas `Jugadores`, `Partidos` y `Votos`.

## Configuración del servidor
1. Instala las dependencias:
   ```bash
   npm install express twilio node-fetch
   ```
2. Copia `server.js` y configura las variables de entorno:
   - `N8N_WEBHOOK_URL`: URL del webhook de n8n que registrará los votos.
   - `PORT`: puerto donde se ejecutará el servidor (opcional, por defecto 3000).
3. Ejecuta el servidor:
   ```bash
   node server.js
   ```
4. En la consola de Twilio, configura la URL pública de `/webhook` como webhook de mensajes entrantes de WhatsApp.

## Configuración de Google Sheets
1. Crea una hoja con las pestañas **Jugadores** y **Partidos**.
2. Obtén el identificador de la hoja (`SHEET_ID`) y una clave de API válida (`API_KEY`).
3. En `script.js` reemplaza los valores de `SHEET_ID` y `API_KEY` por los de tu proyecto.

## Paso a paso en n8n
1. **Webhook**: crea un nuevo nodo *Webhook* con método `POST`. Obtén la URL y utilízala como `N8N_WEBHOOK_URL` en el servidor.
2. **Set**: agrega un nodo *Set* para transformar los campos recibidos (`from`, `message`).
3. **Google Sheets**: usa el nodo *Google Sheets* con la operación *Append* para escribir una fila en la pestaña `Votos` con número de teléfono, mensaje y fecha.
4. **Opcional**: añade nodos adicionales para validar el nombre del jugador o calcular el cierre de la votación.
5. Activa el flujo y prueba enviando un mensaje de WhatsApp al número de Twilio.

La web (`index.html` y `script.js`) obtendrá la información desde Google Sheets para mostrar estadísticas actualizadas.

## Prueba de funcionamiento (QA)

Sigue estos pasos para verificar que todas las conexiones estén operativas:

1. **Iniciar el servidor**
   ```bash
   export N8N_WEBHOOK_URL=<URL_DEL_WEBHOOK>
   node server.js
   ```
2. **Arrancar n8n** y comprobar que el flujo con los nodos *Webhook* → *Set* → *Google Sheets* esté activo.
3. **Configurar Twilio** para enviar los mensajes entrantes al endpoint público `/webhook` del servidor.
4. **Abrir `index.html`** en el navegador y revisar que los jugadores y partidos se cargan desde Sheets sin errores.
5. **Enviar un WhatsApp** al número de Twilio con el nombre de un jugador válido. Debería recibirse la respuesta "Voto recibido para: ...".
6. **Revisar n8n** y la hoja de cálculo para confirmar que se registró una fila en la pestaña `Votos` con el teléfono, el mensaje y la fecha.
7. **Actualizar la página** y verificar que las estadísticas reflejan el nuevo voto si la hoja lo procesa.

Si cualquiera de estos pasos falla, revisa los logs de n8n, del servidor Node y de Twilio para identificar el problema.

