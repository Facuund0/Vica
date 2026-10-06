// =============================================================
//  /api/chat — Rufino responde con Gemini (función de Vercel)
//  Variable de entorno obligatoria: GEMINI_API_KEY
//  Opcional: GEMINI_MODEL (si no, prueba una lista de modelos)
// =============================================================
import "../js/datos.js"; // define globalThis.VICA
import "../mascota/conocimiento.js"; // define globalThis.CONOCIMIENTO

const K = globalThis.CONOCIMIENTO;
const MODELOS = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite"].filter(Boolean);
const IDS_SECCIONES = K.secciones.map((s) => s.id);
const IDS_ELEMENTOS = K.elementos.map((e) => e.id);

const INSTRUCCIONES = `
Sos ${K.mascota.nombre}, la mascota y asistente virtual de la app de ViCa Cooperativa de Vivienda Limitada (Sunchales, Santa Fe, Argentina).
Quién sos: ${K.mascota.personalidad}.

CÓMO RESPONDER
- Respondé SIEMPRE en español rioplatense, cordial y formal, en 1 a 3 oraciones (máximo unas 60 palabras). Tus respuestas se leen en voz alta: sin emojis, sin markdown, sin listas, sin URLs. Escribí cantidades como "333.062 pesos" y fechas como "10 de octubre".
- Preguntas sobre ViCa, la app, la cuenta de la usuaria, la obra, cuotas, votaciones, etc.: usá EXCLUSIVAMENTE los DATOS de abajo y el CONTEXTO actual. Nunca inventes montos, fechas, nombres ni funciones. Si un dato no está, decilo con honestidad y sugerí contactar a la cooperativa.
- Preguntas generales (cooperativismo, leyes, vivienda, trámites en Argentina, conceptos financieros, cultura general, charla): respondé breve y correctamente con tu conocimiento, y si viene al caso, conectalo con ViCa.
- No podés realizar acciones por la usuaria (pagar, votar, enviar formularios). Explicá cómo hacerlo y llevala a la pantalla correcta.
- Si piden algo dañino, ilegal u ofensivo, declinalo con amabilidad.
- Recordá que es una demostración de un proyecto académico si preguntan por cobros, votos o envíos reales.

NAVEGACIÓN
- "destino": id de la pantalla a la que conviene llevar a la usuaria si la pregunta se responde mejor ahí o si pide ir a algún lado. "ninguno" si no hace falta moverse (por ejemplo, charla o preguntas generales).
- "elemento": id de un elemento concreto para señalar, solo si aplica. "ninguno" si no.
- "sugerencias": 2 o 3 preguntas cortas (máximo 6 palabras) que la usuaria podría hacer después, relacionadas con lo que preguntó.

PANTALLAS (id: contenido)
${K.secciones.map((s) => `- ${s.id}: ${s.nombre}, ${s.descripcion}`).join("\n")}

ELEMENTOS SEÑALABLES (id: qué es, pantalla)
${K.elementos.map((e) => `- ${e.id}: ${e.descripcion}${e.vista ? ` (pantalla ${e.vista})` : ""}`).join("\n")}

CÓMO SE USA LA APP
${K.guias}

DATOS
${K.datos}
`.trim();

// "ninguno" en vez de "" porque algunos modelos rechazan enums vacíos
const ESQUEMA = {
  type: "OBJECT",
  properties: {
    respuesta: { type: "STRING" },
    destino: { type: "STRING", enum: ["ninguno", ...IDS_SECCIONES] },
    elemento: { type: "STRING", enum: ["ninguno", ...IDS_ELEMENTOS] },
    sugerencias: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["respuesta", "destino", "elemento", "sugerencias"],
};

async function llamarGemini(modelo, key, contents, conEsquema) {
  const generationConfig = {
    temperature: 0.5,
    // los modelos "pensantes" gastan tokens pensando: dejamos margen de sobra
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
  };
  if (conEsquema) generationConfig.responseSchema = ESQUEMA;
  if (/2\.5/.test(modelo)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // respuestas rápidas
  const r = await fetchConLimite(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: INSTRUCCIONES }] }, contents, generationConfig }),
  }, 9000);
  if (!r.ok) {
    const detalle = (await r.text()).replace(key, "***").slice(0, 400);
    return { ok: false, status: r.status, detalle };
  }
  const data = await r.json();
  const texto = data?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || "").join("") || "";
  const s = parse(texto.replace(/^```(json)?|```$/g, "").trim()) || (texto.trim() ? { respuesta: texto.trim() } : null);
  if (!s || !String(s.respuesta || "").trim()) {
    return { ok: false, status: 204, detalle: "Respuesta vacía (" + (data?.candidates?.[0]?.finishReason || "sin motivo") + ")" };
  }
  return { ok: true, s };
}

// Prueba los modelos en orden; si uno falla, pasa al siguiente
async function responder(key, contents) {
  const errores = [];
  const inicio = Date.now();
  for (const modelo of MODELOS) {
    for (const conEsquema of [true, false]) {
      if (Date.now() - inicio > 20000) return { ok: false, errores: [...errores, { status: 504, detalle: "Se agotó el tiempo probando modelos" }] };
      try {
        const r = await llamarGemini(modelo, key, contents, conEsquema);
        if (r.ok) return { ok: true, modelo, s: r.s };
        errores.push({ modelo, conEsquema, status: r.status, detalle: r.detalle });
        console.error(`Gemini ${modelo} (esquema ${conEsquema}) → ${r.status}`, r.detalle);
        if (r.status === 400 && conEsquema) continue; // reintenta sin esquema
        if ([400, 401, 403].includes(r.status) && /API key|API_KEY|permission/i.test(r.detalle)) return { ok: false, errores }; // key mala: no tiene sentido seguir
        break; // siguiente modelo
      } catch (e) {
        errores.push({ modelo, status: 0, detalle: String(e).slice(0, 200) });
        break;
      }
    }
  }
  return { ok: false, errores };
}

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;

  // Diagnóstico: abrí /api/chat en el navegador para ver si Gemini responde
  if (req.method === "GET") {
    if (!key) return res.status(200).json({ estado: "ERROR", problema: "Falta la variable GEMINI_API_KEY en Vercel (o se agregó y falta hacer Redeploy)." });
    const pruebas = await Promise.all(
      MODELOS.map(async (modelo) => {
        const t0 = Date.now();
        try {
          const r = await fetchConLimite(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Respondé solo el número: ¿cuánto es 2 + 2?" }] }], generationConfig: { maxOutputTokens: 1024 } }),
          }, 8000);
          const ms = Date.now() - t0;
          if (!r.ok) return { modelo, ok: false, status: r.status, ms, detalle: (await r.text()).replace(key, "***").slice(0, 300) };
          const d = await r.json();
          return { modelo, ok: true, ms, respuesta: d?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() };
        } catch (e) {
          return { modelo, ok: false, status: 0, ms: Date.now() - t0, detalle: e.name === "AbortError" ? "Tardó más de 8 segundos" : String(e).slice(0, 200) };
        }
      })
    );
    return res.status(200).json({ estado: pruebas.some((p) => p.ok) ? "OK" : "ERROR", pruebas });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!key) return res.status(503).json({ error: "Falta GEMINI_API_KEY en el servidor" });

  const body = typeof req.body === "string" ? parse(req.body) || {} : req.body || {};
  const mensaje = String(body.mensaje || "").slice(0, 600).trim();
  if (!mensaje) return res.status(400).json({ error: "Mensaje vacío" });

  const contexto = JSON.stringify(body.contexto || {}).slice(0, 1200);
  const historial = Array.isArray(body.historial) ? body.historial.slice(-10) : [];
  const contents = [
    ...historial
      .filter((t) => t && (t.rol === "user" || t.rol === "model") && t.texto)
      .map((t) => ({ role: t.rol, parts: [{ text: String(t.texto).slice(0, 600) }] })),
    { role: "user", parts: [{ text: `[CONTEXTO ACTUAL DE LA APP: ${contexto}]\n${mensaje}` }] },
  ];
  // Gemini exige que la conversación empiece con el usuario
  while (contents.length && contents[0].role !== "user") contents.shift();

  const r = await responder(key, contents);
  if (!r.ok) {
    const ultimo = r.errores.at(-1)?.status;
    return res.status(ultimo === 429 ? 429 : 502).json({ error: "Gemini no respondió", errores: r.errores });
  }
  const s = r.s;
  return res.status(200).json({
    respuesta: String(s.respuesta).trim(),
    destino: IDS_SECCIONES.includes(s.destino) ? s.destino : "",
    elemento: IDS_ELEMENTOS.includes(s.elemento) ? s.elemento : "",
    sugerencias: Array.isArray(s.sugerencias) ? s.sugerencias.slice(0, 3).map((x) => String(x).slice(0, 60)) : [],
    modelo: r.modelo,
  });
}

async function fetchConLimite(url, opciones, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opciones, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

function parse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
