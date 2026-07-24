// Serverless function (Vercel Node runtime). Proxies OpenAI's Whisper API
// server-side (keeps OPENAI_API_KEY secret) to transcribe an audio clip and
// return word-level timestamps, used to sync captions to the real speech
// timing instead of an even word-count split.

export const config = {
  api: { bodyParser: { sizeLimit: "4mb" } }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY não configurada no servidor" });
    return;
  }

  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    res.status(400).json({ error: "Campo 'audioBase64' é obrigatório" });
    return;
  }

  try {
    const buffer = Buffer.from(audioBase64, "base64");
    const type = mimeType || "audio/webm";
    const filename = type.indexOf("webm") > -1 ? "audio.webm" : "audio.mp4";
    const blob = new Blob([buffer], { type: type });

    const form = new FormData();
    form.append("file", blob, filename);
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey },
      body: form
    });

    if (!r.ok) {
      const errText = await r.text().catch(function () { return ""; });
      res.status(r.status).json({ error: "OpenAI error " + r.status + (errText ? ": " + errText : "") });
      return;
    }

    const data = await r.json();
    res.status(200).json({
      text: data.text || "",
      words: Array.isArray(data.words) ? data.words : []
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao transcrever áudio" });
  }
}
