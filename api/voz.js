// =============================================================
//  /api/voz — voz natural de Rufino con Gemini TTS (opcional)
//  Devuelve un audio WAV. Si falla (sin key, sin cuota, modelo no
//  disponible), la app usa automáticamente la voz del navegador.
//  Opcional: GEMINI_TTS_MODEL y GEMINI_VOZ (por defecto "Achird", amigable)
// =============================================================
const MODELOS = [process.env.GEMINI_TTS_MODEL, "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"].filter(Boolean);
const VOZ = process.env.GEMINI_VOZ || "Achird";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const key = process.env.GEMINI_API_KEY;
  if (!key || process.env.DESACTIVAR_VOZ_NATURAL === "1") return res.status(503).json({ error: "Voz natural no configurada" });

  const body = typeof req.body === "string" ? safe(req.body) : req.body || {};
  const texto = String(body?.texto || "").slice(0, 700).trim();
  if (!texto) return res.status(400).json({ error: "Texto vacío" });

  const pedido = {
    contents: [{ parts: [{ text: `Leé en voz alta, en español rioplatense de Argentina, con tono cálido, sereno y profesional, a ritmo natural y sin exagerar: ${texto}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } } },
    },
  };

  for (const modelo of MODELOS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(pedido),
      });
      if (!r.ok) {
        console.error(`TTS ${modelo} → ${r.status}`, (await r.text()).slice(0, 200));
        continue;
      }
      const data = await r.json();
      const parte = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!parte) continue;
      const mime = parte.inlineData.mimeType || "";
      let audio = Buffer.from(parte.inlineData.data, "base64");
      if (!/wav/i.test(mime)) {
        const rate = +(mime.match(/rate=(\d+)/)?.[1] || 24000);
        audio = pcmAWav(audio, rate);
      }
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.status(200).send(audio);
    } catch (e) {
      console.error(modelo, e);
    }
  }
  return res.status(502).json({ error: "TTS no disponible" });
}

function pcmAWav(pcm, rate, canales = 1, bits = 16) {
  const h = Buffer.alloc(44);
  const byteRate = (rate * canales * bits) / 8;
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(canales, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(byteRate, 28); h.writeUInt16LE((canales * bits) / 8, 32); h.writeUInt16LE(bits, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function safe(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
