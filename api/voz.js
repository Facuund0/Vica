// =============================================================
//  /api/voz — voz natural de Rufino con Gemini TTS (opcional)
//  Devuelve un audio WAV. Si falla (sin key, sin cuota, modelo no
//  disponible), la app usa automáticamente la voz del navegador.
//  Opcional: GEMINI_TTS_MODEL y GEMINI_VOZ (por defecto "Achird", amigable)
// =============================================================
const MODELOS = [process.env.GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"].filter(Boolean);
const VOZ = process.env.GEMINI_VOZ || "Achird";
const PERMITIDAS = ["Achird", "Sulafat", "Algieba", "Vindemiatrix", "Charon", "Puck", "Orus", "Kore", "Aoede", "Zephyr"];
const ESTILO = "Decí el siguiente texto como lo diría una persona real de Sunchales, Argentina, charlando con un vecino: acento rioplatense, tono cálido y cercano pero respetuoso, ritmo natural, con pausas y entonación expresiva. Que no suene a locutor ni a contestador automático. Texto:";

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  const q = Object.fromEntries(new URL(req.url || "/", "http://local").searchParams);
  // GET /api/voz?texto=...&voz=... → audio (Vercel lo guarda en caché: la 2ª vez es instantáneo)
  if (req.method === "GET" && q.texto) {
    if (!key || process.env.DESACTIVAR_VOZ_NATURAL === "1") return res.status(503).json({ error: "Voz natural no configurada" });
    return enviarAudio(res, key, String(q.texto).slice(0, 700).trim(), q.voz);
  }
  // Diagnóstico: abrí /api/voz en el navegador
  if (req.method === "GET") {
    if (!key) return res.status(200).json({ estado: "ERROR", problema: "Falta GEMINI_API_KEY" });
    const pruebas = await Promise.all(MODELOS.map(async (modelo) => {
      const t0 = Date.now();
      try {
        const r = await pedirAudio(modelo, key, "Hola, ¿cómo estás?");
        // duración del audio: si es muy larga, el modelo está leyendo también las indicaciones
        const seg = r.ok ? +((r.audio.length - 44) / 48000).toFixed(1) : 0;
        return { modelo, ok: r.ok, status: r.status, ms: Date.now() - t0, segundos: seg, detalle: r.ok ? "audio OK" : r.detalle };
      } catch (e) { return { modelo, ok: false, ms: Date.now() - t0, detalle: String(e).slice(0, 200) }; }
    }));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ estado: pruebas.some((p) => p.ok) ? "OK" : "ERROR", voz: VOZ, url: req.url, pruebas });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!key || process.env.DESACTIVAR_VOZ_NATURAL === "1") return res.status(503).json({ error: "Voz natural no configurada" });

  const body = typeof req.body === "string" ? safe(req.body) : req.body || {};
  const texto = String(body?.texto || "").slice(0, 700).trim();
  if (!texto) return res.status(400).json({ error: "Texto vacío" });

  return enviarAudio(res, key, texto, body?.voz);
}

async function enviarAudio(res, key, texto, vozPedida) {
  if (!texto) return res.status(400).json({ error: "Texto vacío" });
  const voz = PERMITIDAS.includes(vozPedida) ? vozPedida : VOZ;
  for (const modelo of MODELOS) {
    try {
      const r = await pedirAudio(modelo, key, texto, voz);
      if (!r.ok) { console.error(`TTS ${modelo} → ${r.status}`, r.detalle); continue; }
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=31536000, immutable");
      return res.status(200).send(r.audio);
    } catch (e) {
      console.error(modelo, e);
    }
  }
  return res.status(502).json({ error: "TTS no disponible" });
}

async function pedirAudio(modelo, key, texto, voz = VOZ) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${ESTILO} ${texto}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } },
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
