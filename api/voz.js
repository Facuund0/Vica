// =============================================================
//  /api/voz — voz natural de Rufino con Gemini TTS (opcional)
//  Devuelve un audio WAV. Si falla (sin key, sin cuota, modelo no
//  disponible), la app usa automáticamente la voz del navegador.
//  Opcional: GEMINI_TTS_MODEL y GEMINI_VOZ (por defecto "Achird", amigable)
// =============================================================
const MODELOS = [process.env.GEMINI_TTS_MODEL, "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"].filter(Boolean);
const VOZ = process.env.GEMINI_VOZ || "Achird";

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  // Diagnóstico: abrí /api/voz en el navegador
  if (req.method === "GET") {
    if (!key) return res.status(200).json({ estado: "ERROR", problema: "Falta GEMINI_API_KEY" });
    const pruebas = await Promise.all(MODELOS.map(async (modelo) => {
      const t0 = Date.now();
      try {
        const r = await pedirAudio(modelo, key, "Hola");
        return { modelo, ok: r.ok, status: r.status, ms: Date.now() - t0, detalle: r.ok ? "audio OK" : r.detalle };
      } catch (e) { return { modelo, ok: false, ms: Date.now() - t0, detalle: String(e).slice(0, 200) }; }
    }));
    return res.status(200).json({ estado: pruebas.some((p) => p.ok) ? "OK" : "ERROR", voz: VOZ, pruebas });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!key || process.env.DESACTIVAR_VOZ_NATURAL === "1") return res.status(503).json({ error: "Voz natural no configurada" });

  const body = typeof req.body === "string" ? safe(req.body) : req.body || {};
  const texto = String(body?.texto || "").slice(0, 700).trim();
  if (!texto) return res.status(400).json({ error: "Texto vacío" });

  for (const modelo of MODELOS) {
    try {
      const r = await pedirAudio(modelo, key, texto);
      if (!r.ok) { console.error(`TTS ${modelo} → ${r.status}`, r.detalle); continue; }
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.status(200).send(r.audio);
    } catch (e) {
      console.error(modelo, e);
    }
  }
  return res.status(502).json({ error: "TTS no disponible" });
}

async function pedirAudio(modelo, key, texto) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Leé en voz alta, en español rioplatense de Argentina, con tono cálido, sereno y profesional, a ritmo natural y sin exagerar: ${texto}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } } } },
      }),
    });
    if (!r.ok) return { ok: false, status: r.status, detalle: (await r.text()).replace(key, "***").slice(0, 300) };
    const data = await r.json();
    const parte = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!parte) return { ok: false, status: 204, detalle: "Sin audio en la respuesta" };
    const mime = parte.inlineData.mimeType || "";
    let audio = Buffer.from(parte.inlineData.data, "base64");
    if (!/wav/i.test(mime)) audio = pcmAWav(audio, +(mime.match(/rate=(\d+)/)?.[1] || 24000));
    return { ok: true, status: 200, audio };
  } finally { clearTimeout(t); }
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
