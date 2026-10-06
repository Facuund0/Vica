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
- "destino": id de la pantalla a la que conviene llevar a la usuaria si la pregunta se responde mejor ahí o si pide ir a algún lado. Vacío si no hace falta moverse (por ejemplo, charla o preguntas generales).
- "elemento": id de un elemento concreto para señalar, solo si aplica. Vacío si no.
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

const ESQUEMA = {
  type: "OBJECT",
  properties: {
    respuesta: { type: "STRING" },
    destino: { type: "STRING", enum: ["", ...IDS_SECCIONES] },
    elemento: { type: "STRING", enum: ["", ...IDS_ELEMENTOS] },
    sugerencias: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["respuesta", "destino", "elemento", "sugerencias"],
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const key = process.env.GEMINI_API_KEY;
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

  const pedido = {
    systemInstruction: { parts: [{ text: INSTRUCCIONES }] },
    contents,
    generationConfig: { temperature: 0.5, maxOutputTokens: 600, responseMimeType: "application/json", responseSchema: ESQUEMA },
  };

  // Prueba los modelos en orden: si uno no existe o se quedó sin cuota gratis, pasa al siguiente
  let ultimoError = 502;
  for (const modelo of MODELOS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(pedido),
      });
      if (!r.ok) {
        ultimoError = r.status;
        console.error(`Gemini ${modelo} → ${r.status}`, (await r.text()).slice(0, 300));
        if ([404, 429, 500, 503].includes(r.status)) continue;
        break;
      }
      const data = await r.json();
      const texto = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      const s = parse(texto) || { respuesta: texto };
      return res.status(200).json({
        respuesta: String(s.respuesta || "").trim() || K.respuestaPorDefecto,
        destino: IDS_SECCIONES.includes(s.destino) ? s.destino : "",
        elemento: IDS_ELEMENTOS.includes(s.elemento) ? s.elemento : "",
        sugerencias: Array.isArray(s.sugerencias) ? s.sugerencias.slice(0, 3).map((x) => String(x).slice(0, 60)) : [],
        modelo,
      });
    } catch (e) {
      console.error(modelo, e);
    }
  }
  return res.status(ultimoError === 429 ? 429 : 502).json({ error: "Gemini no respondió" });
}

function parse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
