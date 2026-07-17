// Serverless function (Vercel Node runtime). Calls ElevenLabs' text-to-speech API
// server-side, so the API key never reaches the browser.

const ELEVENLABS_URL_BASE = "https://api.elevenlabs.io/v1/text-to-speech/";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — troque pelo ID da voz que preferir no seu painel ElevenLabs

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY não configurada no servidor" });
    return;
  }

  const text = req.body && req.body.text;
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Campo 'text' é obrigatório" });
    return;
  }

  const voiceId = (req.body && req.body.voiceId) || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  try {
    const r = await fetch(ELEVENLABS_URL_BASE + voiceId, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      res.status(r.status).json({ error: "ElevenLabs error: " + errText });
      return;
    }

    const arrayBuffer = await r.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao gerar narração" });
  }
}
