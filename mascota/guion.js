// =============================================================
//  Modo guionado: responde sin IA buscando palabras clave.
//  Se usa para los botones sugeridos y como respaldo cuando
//  Gemini no está disponible (sin servidor, sin key o sin cuota).
// =============================================================
(function () {
  const K = () => globalThis.CONOCIMIENTO;

  function normalizar(t) {
    return String(t)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[¿?¡!.,;:()"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const VERBOS_IR = ["llevame", "lleva", "ir a", "vamos a", "mostrame", "mostra", "abri", "abrir", "quiero ver", "donde esta", "donde estan", "donde veo", "navega", "anda a", "pasame a", "entrar a"];
  const SALUDOS = ["hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "que tal", "como estas", "como andas"];
  const GRACIAS = ["gracias", "genial", "perfecto", "muy amable", "listo", "barbaro", "excelente"];
  const QUIEN = ["quien sos", "como te llamas", "que sos", "sos una ia", "sos un robot", "tu nombre", "rufino"];

  function puntuar(t, palabras) {
    return palabras.reduce((acc, w) => {
      const n = normalizar(w);
      return acc + (t.includes(" " + n) || t.startsWith(n) ? n.length : 0);
    }, 0);
  }

  function responderGuion(mensaje, ctx = {}) {
    const { faq, secciones, mascota, respuestaPorDefecto } = K();
    const t = " " + normalizar(mensaje) + " ";
    const r = (respuesta, destino = "", elemento = "") => ({ respuesta, destino, elemento, fuente: "guion" });

    // Pregunta idéntica a una sugerencia
    const exacta = faq.find((f) => normalizar(f.pregunta) === normalizar(mensaje));
    if (exacta) return r(texto(exacta, ctx), exacta.destino || "", exacta.elemento || "");

    if (QUIEN.some((q) => t.includes(" " + q))) return r(`Soy ${mascota.nombre}, el hornero de ViCa. Soy el asistente virtual de la cooperativa: te ayudo a usar la app y respondo tus dudas.`);

    // Pedido explícito de ir a una sección
    if (VERBOS_IR.some((v) => t.includes(" " + v))) {
      const sec = mejor(secciones, (s) => puntuar(t, [s.nombre, ...s.palabras]));
      if (sec) return r(`Con gusto. Te llevo a ${sec.nombre}.`, sec.id);
    }

    // Pregunta frecuente con más coincidencias
    const f = mejor(faq, (x) => puntuar(t, x.palabras));
    if (f) return r(texto(f, ctx), f.destino || "", f.elemento || "");

    // Nombre de sección suelto
    const sec = mejor(secciones, (s) => puntuar(t, [s.nombre, ...s.palabras]));
    if (sec) return r(`Eso lo encontrás en ${sec.nombre}. Te llevo.`, sec.id);

    if (SALUDOS.some((s) => t.includes(" " + s))) return r(mascota.saludoCorto);
    if (GRACIAS.some((s) => t.includes(" " + s))) return r("Es un gusto. Cualquier otra cosa, acá estoy.");

    return { ...r(respuestaPorDefecto), sinRespuesta: true };
  }

  function texto(f, ctx) {
    return typeof f.respuesta === "function" ? f.respuesta(ctx) : f.respuesta;
  }
  function mejor(lista, fn) {
    let m = null, p = 0;
    for (const x of lista) {
      const s = fn(x);
      if (s > p) { p = s; m = x; }
    }
    return m;
  }

  globalThis.responderGuion = responderGuion;
  globalThis.normalizarTexto = normalizar;
})();
