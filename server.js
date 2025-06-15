require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fetch = require('node-fetch');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

app.post('/webhook', async (req, res) => {
  const from = req.body.From || 'desconocido';
  const message = req.body.Body || 'sin texto';

  try {
    // reenviar a n8n webhook
    const respuesta = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, message })
    });

    console.log(`Mensaje reenviado a n8n desde ${from}: "${message}"`);
    res.send(`<Response><Message>✅ Voto recibido: ${message}</Message></Response>`);
  } catch (err) {
    console.error('Error al enviar a n8n:', err);
    res.status(500).send('Error interno');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor WhatsApp en http://localhost:${PORT}/webhook`);
});




// diff --git a//dev/null b/server.js
// index 0000000000000000000000000000000000000000..559a74bf44df777f214e841985b24f3b99ddc129 100644
// --- a//dev/null
// +++ b/server.js
// @@ -0,0 +1,32 @@
// +const express = require('express');
// +const fetch = require('node-fetch');
// +const { MessagingResponse } = require('twilio').twiml;
// +
// +const app = express();
// +app.use(express.urlencoded({ extended: false }));
// +
// +app.post('/webhook', async (req, res) => {
// +  const from = req.body.From;
// +  const message = (req.body.Body || '').trim();
// +  const twiml = new MessagingResponse();
// +
// +  try {
// +    if (process.env.N8N_WEBHOOK_URL) {
// +      await fetch(process.env.N8N_WEBHOOK_URL, {
// +        method: 'POST',
// +        headers: { 'Content-Type': 'application/json' },
// +        body: JSON.stringify({ from, message })
// +      });
// +    }
// +    twiml.message(`Voto recibido para: ${message}`);
// +  } catch (err) {
// +    console.error('Error enviando a n8n', err);
// +    twiml.message('No se pudo registrar tu voto.');
// +  }
// +
// +  res.writeHead(200, { 'Content-Type': 'text/xml' });
// +  res.end(twiml.toString());
// +});
// +
// +const PORT = process.env.PORT || 3000;
// +app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
