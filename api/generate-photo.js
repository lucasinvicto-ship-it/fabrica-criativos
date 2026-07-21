// Serverless function (Vercel Node runtime). Calls Together.ai's free FLUX.1-schnell-Free
// model server-side, so the API key never reaches the browser. Only uses the free
// model — never falls back to a paid one, so this never generates a surprise charge.

const TOGETHER_URL = "https://api.together.xyz/v1/images/generations";
const MODEL_FREE = "black-forest-labs/FLUX.1-schnell-Free";

async function callTogether(model, prompt, apiKey) {
  const r = await fetch(TOGETHER_URL, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      width: 1024,
      height: 1280,
      steps: 4,
      n: 1,
      response_format: "b64_json"
    })
  });
  const data = await r.json();
  if (!r.ok) {
    const err = new Error((data && data.error && data.error.message) || "Together.ai error");
    err.status = r.status;
    throw err;
  }
  const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error("Resposta da Together.ai sem imagem");
  return b64;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "TOGETHER_API_KEY não configurada no servidor" });
    return;
  }

  const prompt = req.body && req.body.prompt;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Campo 'prompt' é obrigatório" });
    return;
  }

  try {
    const b64 = await callTogether(MODEL_FREE, prompt, apiKey);
    res.status(200).json({ imageDataUrl: "data:image/png;base64," + b64 });
  } catch (err) {
    res.status(err.status || 500).json({ error: (err.message || "Erro ao gerar imagem") + " — o modelo gratuito pode estar com fila cheia, tenta de novo em alguns segundos." });
  }
}
