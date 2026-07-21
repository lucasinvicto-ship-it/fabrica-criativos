// Serverless function (Vercel Node runtime). Proxies Pollinations.ai's free image
// endpoint server-side (avoids browser CORS issues and keeps the canvas untainted
// for PNG/video/GIF export). Pollinations needs no signup, no API key, no card —
// genuinely free, rate-limited to a few requests per minute for anonymous use.

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const prompt = req.body && req.body.prompt;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Campo 'prompt' é obrigatório" });
    return;
  }

  try {
    const url = POLLINATIONS_BASE + encodeURIComponent(prompt) +
      "?width=1024&height=1280&nologo=true&model=flux&seed=" + Math.floor(Math.random() * 1000000);
    const r = await fetch(url);
    if (!r.ok) {
      const errText = await r.text().catch(function () { return ""; });
      res.status(r.status).json({ error: "Pollinations error " + r.status + (errText ? ": " + errText : "") });
      return;
    }
    const contentType = r.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await r.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    res.status(200).json({ imageDataUrl: "data:" + contentType + ";base64," + base64 });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao gerar imagem" });
  }
}
