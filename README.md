 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a//dev/null b/README.md
index 0000000000000000000000000000000000000000..d90f3c9bde714e77a6120e6f7d9b9f0d85aae08c 100644
--- a//dev/null
+++ b/README.md
@@ -0,0 +1,38 @@
+# Torneo de Amigos
+
+Este proyecto es una web para registrar partidos, jugadores y estadísticas. A continuación se describe cómo integrar la votación de la figura del partido vía WhatsApp utilizando Twilio y cómo procesar esos votos con un flujo en n8n.
+
+## Requisitos
+- Node.js 18+
+- Cuenta de Twilio con acceso a la API de WhatsApp
+- Instancia de n8n
+- Una hoja de cálculo de Google con las pestañas `Jugadores`, `Partidos` y `Votos`.
+
+## Configuración del servidor
+1. Instala las dependencias:
+   ```bash
+   npm install express twilio node-fetch
+   ```
+2. Copia `server.js` y configura las variables de entorno:
+   - `N8N_WEBHOOK_URL`: URL del webhook de n8n que registrará los votos.
+   - `PORT`: puerto donde se ejecutará el servidor (opcional, por defecto 3000).
+3. Ejecuta el servidor:
+   ```bash
+   node server.js
+   ```
+4. En la consola de Twilio, configura la URL pública de `/webhook` como webhook de mensajes entrantes de WhatsApp.
+
+## Configuración de Google Sheets
+1. Crea una hoja con las pestañas **Jugadores** y **Partidos**.
+2. Obtén el identificador de la hoja (`SHEET_ID`) y una clave de API válida (`API_KEY`).
+3. En `script.js` reemplaza los valores de `SHEET_ID` y `API_KEY` por los de tu proyecto.
+
+## Paso a paso en n8n
+1. **Webhook**: crea un nuevo nodo *Webhook* con método `POST`. Obtén la URL y utilízala como `N8N_WEBHOOK_URL` en el servidor.
+2. **Set**: agrega un nodo *Set* para transformar los campos recibidos (`from`, `message`).
+3. **Google Sheets**: usa el nodo *Google Sheets* con la operación *Append* para escribir una fila en la pestaña `Votos` con número de teléfono, mensaje y fecha.
+4. **Opcional**: añade nodos adicionales para validar el nombre del jugador o calcular el cierre de la votación.
+5. Activa el flujo y prueba enviando un mensaje de WhatsApp al número de Twilio.
+
+La web (`index.html` y `script.js`) obtendrá la información desde Google Sheets para mostrar estadísticas actualizadas.
+
 
EOF
)