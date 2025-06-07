const express = require('express');
const fetch = require('node-fetch');
const { MessagingResponse } = require('twilio').twiml;
const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const message = (req.body.Body || '').trim();
  const twiml = new MessagingResponse();

  try {
    if (process.env.N8N_WEBHOOK_URL) {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, message })
      });
    }
    twiml.message(`Voto recibido para: ${message}`);
  } catch (err) {
    console.error('Error enviando a n8n', err);
    twiml.message('No se pudo registrar tu voto.');
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
