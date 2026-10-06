// =============================================================
//  RUFINO — el hornero de ViCa
//  Personaje animado que vuela por la página, habla con voz,
//  escucha por micrófono y responde con Gemini (o con el guion
//  si no hay servidor). Requiere: js/datos.js, js/app.js,
//  mascota/conocimiento.js y mascota/guion.js cargados antes.
// =============================================================
(function () {
  const K = globalThis.CONOCIMIENTO;
  const App = window.ViCaApp;
  const responderGuion = globalThis.responderGuion;
  const $ = (s, el = document) => el.querySelector(s);

  const API_CHAT = "api/chat";
  const API_VOZ = "api/voz";
  const HAY_SERVIDOR = location.protocol.startsWith("http");
  const MOVIMIENTO_REDUCIDO = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------
  //  Dibujo del hornero (mira a la derecha)
  // ---------------------------------------------------------------
  const SVG = `
  <svg class="r-svg" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse class="r-sombra" cx="60" cy="112" rx="26" ry="4"/>
    <g class="r-cuerpo-todo">
      <g class="r-patas">
        <g class="r-pata r-pata-a"><path d="M56 90 L54 106 M54 106 l-6 2 M54 106 l5 2.5" /></g>
        <g class="r-pata r-pata-b"><path d="M66 90 L67 106 M67 106 l-6 2 M67 106 l5 2.5" /></g>
      </g>
      <path class="r-cola" d="M34 74 C22 78 14 84 8 92 C18 92 28 88 38 82 Z"/>
      <ellipse class="r-cuerpo" cx="58" cy="72" rx="29" ry="23"/>
      <path class="r-panza" d="M60 90 C74 90 86 82 86 68 C86 62 82 58 78 58 C78 72 70 84 54 90 Z"/>
      <g class="r-ala">
        <path class="r-ala-base" d="M40 62 C52 54 68 58 72 70 C66 84 48 88 36 80 C32 74 34 66 40 62 Z"/>
        <path class="r-ala-pluma" d="M44 72 C52 74 60 74 66 72 M42 78 C50 80 58 80 63 78"/>
      </g>
      <g class="r-cabeza">
        <circle class="r-cabeza-base" cx="82" cy="44" r="18"/>
        <path class="r-garganta" d="M86 52 C92 58 96 56 98 50 C94 52 90 52 86 52 Z"/>
        <path class="r-ceja" d="M76 35 C82 31 90 31 96 35"/>
        <g class="r-ojo">
          <circle class="r-ojo-blanco" cx="88" cy="41" r="5.6"/>
          <circle class="r-pupila" cx="89" cy="41" r="3.1"/>
          <circle class="r-brillo" cx="90.2" cy="39.6" r="1.1"/>
          <rect class="r-parpado" x="81.5" y="34.5" width="13" height="13" rx="6"/>
        </g>
        <path class="r-pico-sup" d="M98 41 C104 41 110 43 115 46 L98 47 Z"/>
        <path class="r-pico-inf" d="M98 47 L113 47.5 C108 50 103 51 98 51 Z"/>
        <path class="r-mejilla" d="M78 49 q4 2 8 0" />
      </g>
      <g class="r-mono">
        <path d="M77 61 L69.5 56.5 L69.5 65.5 Z M77 61 L84.5 56.5 L84.5 65.5 Z"/>
        <circle cx="77" cy="61" r="2.6"/>
      </g>
    </g>
  </svg>`;

  // ---------------------------------------------------------------
  //  Voz: natural (Gemini TTS en el servidor) o la del navegador
  // ---------------------------------------------------------------
  const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function paraVoz(t) {
    return String(t)
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\$\s?([\d.]+)/g, "$1 pesos")
      .replace(/N°\s?/g, "número ")
      .replace(/(\d+)\s?%/g, "$1 por ciento")
      .replace(/m²/g, " metros cuadrados")
      .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_, d, m, a) => `${+d} de ${MESES[+m]} de ${a}`)
      .replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (_, d, m) => (MESES[+m] ? `${+d} de ${MESES[+m]}` : `${d}/${m}`))
      .replace(/(\d{1,2}):(\d{2})\s?hs?\b/g, (_, h, m) => (m === "00" ? `${+h} horas` : `${+h} y ${+m}`))
      .replace(/\bhs\b/g, "horas")
      .replace(/ViCa/g, "Vica")
      .replace(/\s+/g, " ")
      .trim();
  }

  class Voz {
    constructor(alHablar) {
      this.alHablar = alHablar; // (nivel 0..1) para mover el pico
      this.natural = HAY_SERVIDOR;
      this.cache = new Map();
      this.audio = new Audio();
      this.token = 0;
      this.elegirVoz();
      if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", () => this.elegirVoz());
    }

    elegirVoz() {
      if (!("speechSynthesis" in window)) return;
      const voces = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("es"));
      // Las voces "Natural"/"Online" (Edge) y las de Google suenan mucho menos robóticas
      const puntos = (v) =>
        (/natural|online|neural/i.test(v.name) ? 50 : 0) +
        (/google/i.test(v.name) ? 25 : 0) +
        (/es-AR/i.test(v.lang) ? 20 : /es-(419|MX|US|UY|CL|CO)/i.test(v.lang) ? 12 : 4) +
        (/tomas|elena|valentina|jorge|dalia|paloma|alonso/i.test(v.name) ? 8 : 0) -
        (/espeak|robot/i.test(v.name) ? 60 : 0);
      this.vozNavegador = voces.sort((a, b) => puntos(b) - puntos(a))[0] || null;
    }

    detener() {
      this.token++;
      try { this.audio.pause(); } catch {}
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      clearInterval(this.simulador);
      this.alHablar(0);
    }

    async hablar(texto) {
      this.detener();
      const mi = this.token;
      const limpio = paraVoz(texto);
      if (!limpio) return;
      if (this.natural) {
        const ok = await this.hablarNatural(limpio, mi);
        if (ok || mi !== this.token) return;
      }
      if (mi === this.token) await this.hablarNavegador(limpio, mi);
    }

    async hablarNatural(texto, mi) {
      try {
        let url = this.cache.get(texto);
        if (!url) {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 9000);
          const r = await fetch(API_VOZ, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }), signal: ctrl.signal });
          clearTimeout(t);
          if (!r.ok) throw new Error("HTTP " + r.status);
          url = URL.createObjectURL(await r.blob());
          this.cache.set(texto, url);
        }
        if (mi !== this.token) return true;
        this.prepararAnalizador();
        this.audio.src = url;
        await this.audio.play();
        this.seguirAudio(mi);
        await new Promise((ok) => { this.audio.onended = this.audio.onpause = ok; this.audio.onerror = ok; });
        this.alHablar(0);
        return true;
      } catch (e) {
        console.info("[Rufino] Voz natural no disponible, uso la del navegador:", e.message);
        this.natural = false; // no reintenta en esta visita
        return false;
      }
    }

    prepararAnalizador() {
      if (this.analizador) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        const fuente = this.ctx.createMediaElementSource(this.audio);
        this.analizador = this.ctx.createAnalyser();
        this.analizador.fftSize = 512;
        fuente.connect(this.analizador);
        this.analizador.connect(this.ctx.destination);
        this.buffer = new Uint8Array(this.analizador.fftSize);
      } catch { this.analizador = null; }
    }

    seguirAudio(mi) {
      this.ctx?.resume?.();
      const paso = () => {
        if (mi !== this.token || this.audio.paused) return this.alHablar(0);
        if (this.analizador) {
          this.analizador.getByteTimeDomainData(this.buffer);
          let s = 0;
          for (const v of this.buffer) s += (v - 128) ** 2;
          this.alHablar(Math.min(1, Math.sqrt(s / this.buffer.length) / 28));
        } else this.alHablar(0.3 + Math.random() * 0.6);
        requestAnimationFrame(paso);
      };
      paso();
    }

    hablarNavegador(texto, mi) {
      if (!("speechSynthesis" in window)) return Promise.resolve();
      // Partir en oraciones da pausas más naturales
      const frases = texto.match(/[^.!?¿¡]+[.!?]*/g)?.map((f) => f.trim()).filter(Boolean) || [texto];
      return new Promise((resolver) => {
        let i = 0;
        const siguiente = () => {
          if (mi !== this.token || i >= frases.length) { clearInterval(this.simulador); this.alHablar(0); return resolver(); }
          const u = new SpeechSynthesisUtterance(frases[i++]);
          if (this.vozNavegador) { u.voice = this.vozNavegador; u.lang = this.vozNavegador.lang; } else u.lang = "es-AR";
          u.rate = 0.98;
          u.pitch = 0.95;
          u.onstart = () => {
            clearInterval(this.simulador);
            this.simulador = setInterval(() => this.alHablar(0.25 + Math.random() * 0.75), 110);
          };
          u.onboundary = () => this.alHablar(1);
          u.onend = u.onerror = () => { clearInterval(this.simulador); this.alHablar(0); setTimeout(siguiente, 140); };
          speechSynthesis.speak(u);
        };
        siguiente();
      });
    }
  }

  // ---------------------------------------------------------------
  //  Rufino
  // ---------------------------------------------------------------
  class Rufino {
    constructor() {
      this.historial = [];
      this.vozActiva = true;
      this.guia = true; // consejos al entrar a cada pantalla
      this.vistosConsejos = new Set(["inicio"]);
      this.ocupado = false;
      this.navegoRufino = false;
      this.x = innerWidth + 140;
      this.y = innerHeight - 160;
      this.enCasa = false;

      this.crear();
      this.voz = new Voz((n) => this.root.style.setProperty("--boca", n.toFixed(2)));
      this.prepararMicrofono();
      this.ojosQueSiguen();
      this.parpadeo();
      this.colocar(this.x, this.y, 0);

      App.alIngresar(() => this.entrar());
      App.alCambiarVista((v) => this.alCambiarVista(v));
      addEventListener("resize", () => { if (this.enCasa) this.volverACasa(true); });
      setTimeout(() => this.vagar(), 40000);
    }

    // ---------- DOM ----------
    crear() {
      const root = document.createElement("div");
      root.className = "rufino";
      root.innerHTML = `
        <div class="r-burbuja" hidden><span class="r-burbuja-texto"></span><button class="r-burbuja-cerrar" type="button" aria-label="Cerrar mensaje">✕</button></div>
        <button class="r-personaje" type="button" aria-label="Hablar con Rufino, el asistente de ViCa"><div class="r-arco">${SVG}</div></button>`;
      document.body.appendChild(root);
      this.root = root;
      this.burbuja = $(".r-burbuja", root);

      const panel = document.createElement("section");
      panel.className = "r-panel";
      panel.hidden = true;
      panel.setAttribute("aria-label", "Chat con Rufino");
      panel.innerHTML = `
        <header class="r-cab">
          <div class="r-cab-avatar">${SVG}</div>
          <div class="r-cab-texto"><strong>Rufino</strong><span class="r-estado">Asistente virtual de ViCa</span></div>
          <button class="r-icono r-btn-guia" type="button" title="Consejos al cambiar de pantalla" aria-pressed="true">💡</button>
          <button class="r-icono r-btn-voz" type="button" title="Silenciar la voz" aria-pressed="true">🔊</button>
          <button class="r-icono r-btn-cerrar" type="button" title="Cerrar">✕</button>
        </header>
        <div class="r-mensajes" aria-live="polite"></div>
        <div class="r-sugerencias"></div>
        <form class="r-form">
          <button class="r-icono r-mic" type="button" title="Hablarle a Rufino">🎤</button>
          <input class="r-input" type="text" placeholder="Escribí tu consulta…" autocomplete="off" maxlength="500" aria-label="Tu consulta">
          <button class="r-enviar" type="submit" aria-label="Enviar">➤</button>
        </form>
        <p class="r-pie">${HAY_SERVIDOR ? "Respuestas con IA (Gemini). Puede equivocarse: ante dudas importantes, consultá a la cooperativa." : "Modo sin conexión al servidor: respuestas predefinidas."}</p>`;
      document.body.appendChild(panel);
      this.panel = panel;
      this.mensajes = $(".r-mensajes", panel);
      this.input = $(".r-input", panel);

      $(".r-personaje", root).addEventListener("click", () => this.alternarPanel());
      $(".r-burbuja-cerrar", root).addEventListener("click", (e) => { e.stopPropagation(); this.ocultarBurbuja(); this.voz.detener(); });
      this.burbuja.addEventListener("click", (e) => { if (!e.target.closest("button")) this.alternarPanel(true); });
      $(".r-btn-cerrar", panel).addEventListener("click", () => this.alternarPanel(false));
      $(".r-btn-voz", panel).addEventListener("click", (e) => {
        this.vozActiva = !this.vozActiva;
        e.currentTarget.textContent = this.vozActiva ? "🔊" : "🔇";
        e.currentTarget.setAttribute("aria-pressed", String(this.vozActiva));
        e.currentTarget.title = this.vozActiva ? "Silenciar la voz" : "Activar la voz";
        if (!this.vozActiva) this.voz.detener();
      });
      $(".r-btn-guia", panel).addEventListener("click", (e) => {
        this.guia = !this.guia;
        e.currentTarget.setAttribute("aria-pressed", String(this.guia));
        e.currentTarget.classList.toggle("apagado", !this.guia);
        App.toast(this.guia ? "Rufino te va a dar consejos al cambiar de pantalla." : "Rufino ya no comenta al cambiar de pantalla.");
      });
      $(".r-form", panel).addEventListener("submit", (e) => {
        e.preventDefault();
        const t = this.input.value.trim();
        if (t) { this.input.value = ""; this.preguntar(t); }
      });
      this.pintarSugerencias();
    }

    // ---------- Movimiento ----------
    get tam() { return innerWidth < 640 ? 84 : 112; }
    casa() { return { x: innerWidth - this.tam - (innerWidth < 640 ? 8 : 18), y: innerHeight - this.tam - (innerWidth < 640 ? 6 : 12) }; }

    colocar(x, y, dur) {
      this.root.style.setProperty("--dur", dur + "ms");
      this.root.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      this.x = x; this.y = y;
      this.ajustarBurbuja();
    }

    // Mantiene el globo dentro de la pantalla, del lado que haya lugar
    ajustarBurbuja() {
      if (!this.burbuja || this.burbuja.hidden) return;
      const w = this.burbuja.offsetWidth, t = this.tam;
      const aLaIzq = this.x + t / 2 > innerWidth / 2;
      let izq = aLaIzq ? t - 30 - w : 30; // posición relativa al pájaro
      const abs = this.x + izq;
      if (abs < 8) izq += 8 - abs;
      if (abs + w > innerWidth - 8) izq -= abs + w - (innerWidth - 8);
      this.burbuja.style.left = izq + "px";
      this.root.classList.toggle("burbuja-izq", aLaIzq);
      // si el pájaro está muy arriba, el globo va abajo
      this.root.classList.toggle("burbuja-abajo", !!this.burbujaAbajo || this.y < this.burbuja.offsetHeight + 20);
    }

    async moverA(x, y, modo = "vuelo") {
      const dist = Math.hypot(x - this.x, y - this.y);
      if (dist < 4) return;
      this.mirar(x < this.x ? "izq" : "der");
      if (MOVIMIENTO_REDUCIDO) { this.colocar(x, y, 0); return; }
      const dur = modo === "vuelo" ? Math.min(1500, 500 + dist * 0.9) : Math.min(4000, dist * 9);
      this.estado(modo === "vuelo" ? "volando" : "caminando", true);
      this.root.style.setProperty("--arco", modo === "vuelo" ? `-${Math.min(90, 30 + dist * 0.12)}px` : "0px");
      this.colocar(x, y, dur);
      await esperar(dur);
      this.estado("volando", false);
      this.estado("caminando", false);
      this.ajustarBurbuja();
      this.estado("aterriza", true);
      setTimeout(() => this.estado("aterriza", false), 380);
    }

    mirar(lado) { this.root.classList.toggle("mira-izq", lado === "izq"); }
    estado(nombre, on) { this.root.classList.toggle(nombre, on); }

    async volverACasa(inmediato) {
      const c = this.casa();
      this.enCasa = true;
      if (inmediato) return this.colocar(c.x, c.y, 0);
      await this.moverA(c.x, c.y, "vuelo");
      this.mirar("izq");
    }

    async volarA(el) {
      if (!el) return;
      await esperar(550); // deja terminar el scroll suave
      const r = el.getBoundingClientRect();
      const t = this.tam;
      const margen = 12;
      let x, y, lado;
      if (r.left - t - margen > 0) { x = r.left - t - margen + 18; lado = "der"; }
      else if (r.right + t + margen < innerWidth) { x = r.right + margen - 18; lado = "izq"; }
      else { x = Math.min(innerWidth - t - 8, r.right - t); lado = "izq"; }
      y = Math.min(innerHeight - t - 8, Math.max(76, r.top + Math.min(r.height, 120) / 2 - t / 2));
      if (innerWidth < 640) { x = Math.min(innerWidth - t - 8, Math.max(8, r.left + 10)); y = Math.max(76, Math.min(innerHeight - t - 8, r.top - t + 20)); lado = "der"; }
      this.enCasa = false;
      await this.moverA(x, y, "vuelo");
      this.mirar(lado);
      this.estado("senalando", true);
    }

    // ---------- Entrada ----------
    async entrar() {
      this.ocupado = true;
      // Arranca fuera de pantalla, vuela al centro de la portada y saluda
      this.colocar(innerWidth + 120, Math.max(90, innerHeight * 0.25), 0);
      await esperar(250);
      const centroX = Math.min(innerWidth - this.tam - 20, innerWidth * (innerWidth < 640 ? 0.5 : 0.62));
      await this.moverA(centroX, Math.max(90, innerHeight * 0.32), "vuelo");
      this.mirar("izq");
      this.estado("saludando", true);
      setTimeout(() => this.estado("saludando", false), 1600);
      const saludo = K.mascota.saludo;
      this.mostrarBurbuja(saludo);
      this.agregarMensaje("bot", saludo);
      await this.decir(saludo);
      await esperar(600);
      await this.volverACasa();
      this.ocupado = false;
    }

    // ---------- Conversación ----------
    alternarPanel(forzar) {
      const abrir = forzar ?? this.panel.hidden;
      this.panel.hidden = !abrir;
      this.root.classList.toggle("panel-abierto", abrir);
      if (abrir) {
        this.ocultarBurbuja();
        if (!this.mensajes.children.length) this.agregarMensaje("bot", K.mascota.saludoCorto);
        this.pintarSugerencias();
        setTimeout(() => this.input.focus(), 50);
        this.estado("saludando", true);
        setTimeout(() => this.estado("saludando", false), 900);
      }
    }

    agregarMensaje(quien, texto) {
      const div = document.createElement("div");
      div.className = "r-msg r-" + quien;
      div.textContent = texto;
      this.mensajes.appendChild(div);
      this.mensajes.scrollTop = this.mensajes.scrollHeight;
      return div;
    }

    pintarSugerencias(lista) {
      const v = App.vistaActual();
      const items = (lista && lista.length ? lista : K.sugerenciasPorVista[v] || K.sugerenciasPorVista._).slice(0, 3);
      const box = $(".r-sugerencias", this.panel);
      box.innerHTML = "";
      items.forEach((s) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = s;
        b.addEventListener("click", () => this.preguntar(s));
        box.appendChild(b);
      });
    }

    setEstadoTexto(t) { $(".r-estado", this.panel).textContent = t; }

    async preguntar(texto, { porVoz = false } = {}) {
      if (this.panel.hidden) this.alternarPanel(true);
      this.voz.detener();
      this.agregarMensaje("user", texto);
      const escribiendo = this.agregarMensaje("bot escribiendo", "…");
      this.ocupado = true;
      this.estado("pensando", true);
      this.setEstadoTexto("pensando…");

      const ctx = App.contexto();
      const esSugerencia = K.faq.some((f) => f.pregunta === texto);
      let r = null;
      if (!esSugerencia && HAY_SERVIDOR) r = await this.preguntarGemini(texto, ctx);
      if (!r) r = responderGuion(texto, ctx);
      const sinIA = this.falloIA && !esSugerencia;
      this.falloIA = false;

      escribiendo.remove();
      this.estado("pensando", false);
      this.agregarMensaje("bot", r.respuesta);
      if (sinIA) this.agregarMensaje("aviso", "Respuesta sin IA: no se pudo conectar con Gemini. Abrí /api/chat en el navegador para ver el diagnóstico.");
      this.historial.push({ rol: "user", texto }, { rol: "model", texto: r.respuesta });
      this.historial = this.historial.slice(-10);

      // Navegar y señalar mientras habla
      let vuelo = Promise.resolve();
      const destino = r.destino || (r.elemento ? K.elementos.find((e) => e.id === r.elemento)?.vista : "");
      if (destino || r.elemento) {
        this.navegoRufino = true;
        if (innerWidth < 640) this.alternarPanel(false);
        vuelo = App.ir(destino, r.elemento).then((el) => this.volarA(r.elemento ? el : $("#contenido h1")));
        if (innerWidth < 640) this.mostrarBurbuja(r.respuesta);
      }
      this.pintarSugerencias(r.sugerencias);
      await Promise.all([this.decir(r.respuesta), vuelo]);
      await esperar(1200);
      this.estado("senalando", false);
      if (!this.enCasa) await this.volverACasa();
      this.ocupado = false;
      this.setEstadoTexto("Asistente virtual de ViCa");
      if (porVoz && this.conversacionContinua) this.escuchar();
    }

    async preguntarGemini(texto, contexto) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(API_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: texto, historial: this.historial, contexto }),
          signal: ctrl.signal,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { console.warn("[Rufino] Gemini falló:", res.status, d.errores || d.error); throw new Error("HTTP " + res.status); }
        return d.respuesta ? d : null;
      } catch (e) {
        console.info("[Rufino] Gemini no disponible, uso el guion:", e.message);
        this.falloIA = true;
        return null;
      } finally { clearTimeout(t); }
    }

    async decir(texto) {
      this.estado("hablando", true);
      this.setEstadoTexto("hablando…");
      if (this.vozActiva) await this.voz.hablar(texto);
      else {
        // sin voz, el pico se mueve solo con la animación CSS
        this.estado("sin-voz", true);
        await esperar(Math.min(4500, 500 + texto.length * 40));
        this.estado("sin-voz", false);
      }
      this.estado("hablando", false);
      this.setEstadoTexto("Asistente virtual de ViCa");
    }

    mostrarBurbuja(texto) {
      if (!this.panel.hidden) return;
      $(".r-burbuja-texto", this.root).textContent = texto;
      this.burbuja.hidden = false;
      this.ajustarBurbuja();
      clearTimeout(this.tBurbuja);
      this.tBurbuja = setTimeout(() => this.ocultarBurbuja(), Math.max(6000, texto.length * 70));
    }
    ocultarBurbuja() { this.burbuja.hidden = true; }

    // ---------- Consejos por pantalla ----------
    async alCambiarVista(vista) {
      if (this.navegoRufino) { this.navegoRufino = false; return; }
      // el usuario navegó por su cuenta: Rufino deja de hablar de lo anterior
      this.ocultarBurbuja();
      this.voz?.detener();
      if (this.panel && !this.panel.hidden) this.pintarSugerencias();
      const consejo = K.consejos[vista];
      if (!this.guia || !consejo || this.vistosConsejos.has(vista) || this.ocupado || !this.panel.hidden || document.getElementById("splash")) return;
      this.vistosConsejos.add(vista);
      this.ocupado = true;
      await esperar(700);
      const h1 = $("#contenido h1");
      if (h1 && innerWidth >= 640) {
        // se posa justo después de la última palabra del título
        const rng = document.createRange();
        rng.selectNodeContents(h1);
        const rects = rng.getClientRects();
        const r = rects[rects.length - 1] || h1.getBoundingClientRect();
        let x = r.right + 8, y = r.top + r.height / 2 - this.tam * 0.62;
        if (x > innerWidth - this.tam - 20) { x = innerWidth - this.tam - 20; y = r.bottom + 4; this.burbujaAbajo = true; }
        this.enCasa = false;
        await this.moverA(x, Math.max(72, y), "vuelo");
        this.mirar("izq");
      }
      this.mostrarBurbuja(consejo);
      await this.decir(consejo);
      await esperar(900);
      this.burbujaAbajo = false;
      await this.volverACasa();
      this.ocupado = false;
    }

    // ---------- Vida propia ----------
    async vagar() {
      const libre = !this.ocupado && this.panel.hidden && this.enCasa && !document.hidden && !MOVIMIENTO_REDUCIDO && !document.getElementById("splash");
      if (libre) {
        const accion = ["picotear", "mirar", "caminar", "acicalarse", "caminar"][Math.floor(Math.random() * 5)];
        this.ocupado = true;
        if (accion === "caminar") {
          const c = this.casa();
          const x = Math.max(20, c.x - 120 - Math.random() * Math.min(420, innerWidth * 0.4));
          this.enCasa = false;
          await this.moverA(x, c.y, "caminar");
          this.estado("picoteando", true); await esperar(1400); this.estado("picoteando", false);
          await this.moverA(c.x, c.y, "caminar");
          this.enCasa = true;
          this.mirar("izq");
        } else {
          const cls = { picotear: "picoteando", mirar: "mirando", acicalarse: "acicalando" }[accion];
          this.estado(cls, true); await esperar(2200); this.estado(cls, false);
        }
        this.ocupado = false;
      }
      setTimeout(() => this.vagar(), 30000 + Math.random() * 30000);
    }

    parpadeo() {
      const p = () => {
        this.estado("parpadea", true);
        setTimeout(() => this.estado("parpadea", false), 150);
        setTimeout(p, 2200 + Math.random() * 3800);
      };
      setTimeout(p, 1500);
    }

    ojosQueSiguen() {
      let pend = false, px = 0, py = 0;
      addEventListener("pointermove", (e) => {
        px = e.clientX; py = e.clientY;
        if (pend) return;
        pend = true;
        requestAnimationFrame(() => {
          pend = false;
          const izq = this.root.classList.contains("mira-izq");
          const ox = this.x + this.tam * (izq ? 0.27 : 0.73), oy = this.y + this.tam * 0.34;
          let dx = (px - ox) / 200, dy = (py - oy) / 200;
          if (izq) dx = -dx;
          const m = Math.hypot(dx, dy) || 1, k = Math.min(1, m);
          this.root.style.setProperty("--ojo-x", ((dx / m) * k * 1.8).toFixed(2) + "px");
          this.root.style.setProperty("--ojo-y", ((dy / m) * k * 1.6).toFixed(2) + "px");
        });
      }, { passive: true });
    }

    // ---------- Micrófono ----------
    prepararMicrofono() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const btn = $(".r-mic", this.panel);
      if (!SR) {
        btn.disabled = true;
        btn.title = "Tu navegador no permite dictado (probá con Chrome o Edge). Podés escribir igual.";
        return;
      }
      this.conversacionContinua = true;
      const rec = new SR();
      rec.lang = "es-AR";
      rec.interimResults = true;
      rec.continuous = false;
      let huboResultado = false;
      rec.onresult = (e) => {
        const res = Array.from(e.results);
        this.input.value = res.map((r) => r[0].transcript).join("");
        if (res.at(-1).isFinal) {
          huboResultado = true;
          const t = this.input.value.trim();
          this.input.value = "";
          if (t) this.preguntar(t, { porVoz: true });
        }
      };
      rec.onend = () => {
        this.escuchando = false;
        btn.classList.remove("activo");
        this.estado("escuchando", false);
        if (!huboResultado && !this.ocupado) this.setEstadoTexto("Asistente virtual de ViCa");
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") this.agregarMensaje("bot", "Necesito permiso para usar el micrófono. Podés habilitarlo desde el candado de la barra de direcciones.");
      };
      this.escuchar = () => {
        if (this.escuchando) return;
        this.voz.detener();
        huboResultado = false;
        try { rec.start(); } catch { return; }
        this.escuchando = true;
        btn.classList.add("activo");
        this.estado("escuchando", true);
        this.setEstadoTexto("te escucho…");
      };
      btn.addEventListener("click", () => (this.escuchando ? rec.stop() : this.escuchar()));
    }
  }

  const iniciar = () => (window.rufino = new Rufino());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
