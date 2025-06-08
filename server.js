const express = require('express');
const fetch = require('node-fetch');
const { MessagingResponse } = require('twilio').twiml;
const twilio = require('twilio');
const SHEET_ID = "15SFBZPl54ZaYNrTeog0COivI0e9wI_eHLcZJTaNUz7Y";
const API_KEY = "AIzaSyBs6mHcPVaWd4wp3NA3bnwbQOYJ1Rr9p_c";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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

app.post('/notify', async (req, res) => {
  const { numeros = [], partido } = req.body;
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
  const body = `Respondé con el nombre de tu figura del partido: ${partido}`;
  try {
    await Promise.all(
      numeros.map((n) =>
        client.messages.create({ from, to: `whatsapp:${n}`, body })
      )
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error enviando notificaciones', err);
    res.status(500).json({ error: 'Fallo notificaciones' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
