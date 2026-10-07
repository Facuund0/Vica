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
      <g class="r-ala-atras"><path class="r-ala-atras-base" d="M46 60 C58 50 74 52 78 62 C72 72 56 76 44 70 C40 66 41 62 46 60 Z"/></g>
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

  // Voces de Gemini (las de "estilo" suenan más humanas que la del navegador)
  const VOCES = [
    { id: "Achird", nombre: "Achird · amigable" },
    { id: "Sulafat", nombre: "Sulafat · cálida" },
    { id: "Algieba", nombre: "Algieba · suave" },
    { id: "Vindemiatrix", nombre: "Vindemiatrix · amable" },
    { id: "Charon", nombre: "Charon · informativa" },
    { id: "Puck", nombre: "Puck · alegre" },
    { id: "Orus", nombre: "Orus · firme" },
    { id: "navegador", nombre: "Voz del navegador" },
  ];
  const leerPref = (k, def) => { try { return localStorage.getItem(k) || def; } catch { return def; } };
  const guardarPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  class Voz {
    constructor(alHablar) {
      this.alHablar = alHablar; // (nivel 0..1) para mover el pico
      this.vozElegida = leerPref("rufino-voz", "Achird");
      this.natural = HAY_SERVIDOR && this.vozElegida !== "navegador";
      this.fallos = 0;
      this.cache = new Map();
      this.token = 0;
      this.elegirVoz();
      if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", () => this.elegirVoz());
    }

    cambiarVoz(id) {
      if (id.startsWith("nav:")) {
        // una voz puntual del navegador
        const nombre = id.slice(4);
        this.vozNavegador = this.vocesNavegador?.find((v) => v.name === nombre) || this.vozNavegador;
        guardarPref("rufino-voz-nav", nombre);
        id = "navegador";
      } else if (id === "navegador") {
        guardarPref("rufino-voz-nav", ""); // automática: la mejor que haya
        this.elegirVoz();
      }
      this.vozElegida = id;
      guardarPref("rufino-voz", id);
      this.natural = HAY_SERVIDOR && id !== "navegador";
      this.fallos = 0;
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
      this.vocesNavegador = voces.sort((a, b) => puntos(b) - puntos(a));
      const preferida = leerPref("rufino-voz-nav", "");
      this.vozNavegador = this.vocesNavegador.find((v) => v.name === preferida) || this.vocesNavegador[0] || null;
      this.alCambiarLista?.();
    }

    detener() {
      this.token++;
      try { this.actual?.pause(); } catch {}
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      clearInterval(this.simulador);
      this.alHablar(0);
    }

    // Parte el texto en trozos: el primero, corto, se genera rápido y empieza a sonar
    // mientras se generan los demás en paralelo.
    // Un solo pedido de audio por mensaje: el plan gratis de Gemini permite
    // pocos pedidos por minuto, así que no conviene partir el texto.
    trozos(texto) { return [texto]; }

    audioDe(trozo) {
      const clave = this.vozElegida + "|" + trozo;
      let a = this.cache.get(clave);
      if (!a) {
        a = new Audio();
        a.preload = "auto";
        a.src = `${API_VOZ}?voz=${encodeURIComponent(this.vozElegida)}&texto=${encodeURIComponent(trozo)}`;
        a.load(); // empieza a descargar ya
        this.cache.set(clave, a);
        a.addEventListener("error", () => this.cache.delete(clave), { once: true });
      }
      return a;
    }

    // Descarga el audio por adelantado (por ejemplo, el saludo durante la bienvenida)
    precargar(texto) {
      if (!this.natural) return;
      this.trozos(paraVoz(texto)).forEach((t) => this.audioDe(t));
    }

    empezo() { const f = this.alEmpezar; this.alEmpezar = null; f?.(); }

    async hablar(texto, alEmpezar) {
      this.detener();
      this.alEmpezar = alEmpezar;
      const mi = this.token;
      const limpio = paraVoz(texto);
      if (!limpio) return;
      let resto = limpio;
      if (this.natural) {
        resto = await this.hablarNatural(limpio, mi);
        if (!resto || mi !== this.token) return;
      }
      if (mi === this.token) await this.hablarNavegador(resto, mi);
      this.empezo(); // por si no llegó a sonar nada
    }

    // Devuelve "" si dijo todo, o el texto que faltó decir si algo falló
    async hablarNatural(texto, mi) {
      const partes = this.trozos(texto);
      const audios = partes.map((t) => this.audioDe(t)); // todos se descargan en paralelo
      for (let i = 0; i < audios.length; i++) {
        if (mi !== this.token) return "";
        try {
          await this.reproducir(audios[i], mi);
          this.fallos = 0;
        } catch (e) {
          console.info("[Rufino] Voz natural no disponible esta vez, sigo con la del navegador:", e.message);
          this.cache.delete(this.vozElegida + "|" + partes[i]);
          this.fallos++; // solo este mensaje usa la voz del navegador; el próximo vuelve a probar Gemini
          return partes.slice(i).join(" ");
        }
      }
      return "";
    }

    reproducir(a, mi) {
      return new Promise((ok, mal) => {
        this.actual = a;
        this.conectar(a);
        try { a.currentTime = 0; } catch {}
        const limite = setTimeout(() => { a.pause(); mal(new Error("tardó demasiado")); }, 15000);
        const fin = () => { limpiar(); this.alHablar(0); ok(); };
        const error = () => { limpiar(); mal(new Error("no se pudo generar el audio")); };
        const limpiar = () => { clearTimeout(limite); a.removeEventListener("ended", fin); a.removeEventListener("pause", fin); a.removeEventListener("error", error); };
        a.addEventListener("ended", fin);
        a.addEventListener("error", error);
        if (a.error) return error();
        a.play().then(() => {
          clearTimeout(limite);
          this.empezo();
          a.addEventListener("pause", fin);
          this.seguirAudio(a, mi);
        }, error);
      });
    }

    conectar(a) {
      if (a._conectado) return;
      try {
        if (!this.ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new Ctx();
          this.analizador = this.ctx.createAnalyser();
          this.analizador.fftSize = 512;
          this.analizador.connect(this.ctx.destination);
          this.buffer = new Uint8Array(this.analizador.fftSize);
        }
        this.ctx.createMediaElementSource(a).connect(this.analizador);
        a._conectado = true;
      } catch { /* sin analizador: el pico se mueve con un valor aproximado */ }
      this.ctx?.resume?.();
    }

    seguirAudio(a, mi) {
      const paso = () => {
        if (mi !== this.token || a.paused) return this.alHablar(0);
        if (this.analizador && a._conectado) {
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
      if (!("speechSynthesis" in window)) { this.empezo(); return Promise.resolve(); }
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
            this.empezo();
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
  //  Motor de animación cuadro a cuadro (60 fps) con resortes.
  //  Cada parte del hornero tiene inercia propia: así la cola y la
  //  cabeza "siguen" al cuerpo y todo se mueve como un dibujo animado.
  // ---------------------------------------------------------------
  class Resorte {
    constructor(valor = 0, rigidez = 170, amort = 18) { this.v = valor; this.vel = 0; this.obj = valor; this.k = rigidez; this.c = amort; }
    paso(dt) {
      const a = this.k * (this.obj - this.v) - this.c * this.vel;
      this.vel += a * dt;
      this.v += this.vel * dt;
      return this.v;
    }
    empujar(impulso) { this.vel += impulso; }
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease in-out cúbico

  class Animador {
    constructor(r) {
      this.r = r;
      const svg = $(".r-svg", r.root);
      const q = (c) => $(c, svg);
      this.el = {
        svg, arco: $(".r-arco", r.root), todo: q(".r-cuerpo-todo"), cabeza: q(".r-cabeza"), ala: q(".r-ala"), alaAtras: q(".r-ala-atras"), cola: q(".r-cola"),
        pataA: q(".r-pata-a"), pataB: q(".r-pata-b"), picoInf: q(".r-pico-inf"), parpado: q(".r-parpado"),
        pupila: q(".r-pupila"), brillo: q(".r-brillo"), sombra: q(".r-sombra"), ojoBlanco: q(".r-ojo-blanco"),
      };
      // resortes de cada parte
      this.mirada = new Resorte(1, 260, 22);        // 1 = mira a la derecha, -1 = izquierda (pasa por 0 al girar)
      this.cabeza = new Resorte(0, 320, 19);       // rápida: los pájaros mueven la cabeza a saltos
      this.cabezaX = new Resorte(0, 160, 14);
      this.cabezaY = new Resorte(0, 160, 14);
      this.cola = new Resorte(0, 90, 5);            // poco amortiguada: se bambolea
      this.ala = new Resorte(0, 320, 20);
      this.squash = new Resorte(1, 260, 13);        // aplastar/estirar
      this.inclinacion = new Resorte(0, 120, 16);   // inclinación en vuelo
      this.pico = new Resorte(0, 700, 32);
      this.pupX = new Resorte(0, 220, 20);
      this.pupY = new Resorte(0, 220, 20);
      this.recoger = new Resorte(0, 200, 20);       // patas recogidas en vuelo
      this.pesoAleteo = new Resorte(0, 90, 16);     // mezcla entre ala quieta y aleteo
      this.sombraOp = new Resorte(1, 120, 18);
      this.saltoY = 0; this.saltoV = 0; this.preSalto = 0; this.proxSalto = 5 + Math.random() * 5;
      this.proxGesto = 1;

      this.vozNivel = 0;
      this.ojoObj = { x: 0, y: 0 };
      this.t = 0;
      this.faseAleteo = 0;
      this.fasePaso = 0;
      this.mov = null;           // movimiento en curso
      this.proxMirada = 1.5;     // próxima mirada al azar
      this.miradaAzar = 0;
      this.proxParpadeo = 2;
      this.parpadeo = 0;
      this.proxColeteo = 3;
      this.ultimo = performance.now();
      requestAnimationFrame((ts) => this.cuadro(ts));
    }

    // Movimiento: devuelve una promesa que se cumple al llegar
    mover(x, y, modo) {
      const r = this.r;
      return new Promise((listo) => {
        const dx = x - r.x, dy = y - r.y, dist = Math.hypot(dx, dy);
        if (MOVIMIENTO_REDUCIDO || dist < 3) { r.colocar(x, y); return listo(); }
        const vuelo = modo === "vuelo";
        const dur = vuelo ? limitar(0.55 + dist / 900, 0.6, 1.6) : limitar(dist / 110, 0.6, 4.5);
        const alto = vuelo ? limitar(40 + dist * 0.18, 40, 140) : 0;
        // punto de control de la curva: por encima de la recta
        const cp = { x: r.x + dx / 2, y: Math.min(r.y, y) - alto };
        this.mov = { vuelo, x0: r.x, y0: r.y, x1: x, y1: y, cp, dur, t: vuelo ? -0.16 : 0, listo, dist };
        if (vuelo) { this.squash.obj = 0.82; } // anticipación: se agacha antes de saltar
      });
    }

    cuadro(ts) {
      const dt = Math.min(0.05, (ts - this.ultimo) / 1000);
      this.ultimo = ts;
      this.t += dt;
      this.actualizar(dt);
      requestAnimationFrame((t2) => this.cuadro(t2));
    }

    actualizar(dt) {
      const r = this.r, e = r.estados, T = this.t;
      let volando = false, caminando = false, vx = 0;

      // ---- desplazamiento ----
      const m = this.mov;
      if (m) {
        m.t += dt / m.dur;
        if (m.vuelo && m.t < 0) {
          // fase de anticipación (agachado)
        } else {
          if (m.vuelo && !m.despego) { m.despego = true; this.squash.obj = 1; this.squash.empujar(6); this.cola.empujar(-120); }
          const p = limitar(m.t, 0, 1);
          const k = m.vuelo ? suave(p) : p;
          let nx, ny;
          if (m.vuelo) {
            const u = 1 - k;
            nx = u * u * m.x0 + 2 * u * k * m.cp.x + k * k * m.x1;
            ny = u * u * m.y0 + 2 * u * k * m.cp.y + k * k * m.y1;
            volando = true;
          } else {
            nx = lerp(m.x0, m.x1, k); ny = lerp(m.y0, m.y1, k);
            caminando = true;
            this.fasePaso += Math.abs(nx - r.x) / 14; // el paso depende de la distancia: los pies no patinan
          }
          vx = (nx - r.x) / Math.max(dt, 0.001);
          r.colocar(nx, ny);
          if (m.t >= 1) {
            this.mov = null;
            if (m.vuelo) { this.squash.empujar(-7); this.cola.empujar(160); this.cabeza.empujar(-60); } // aterrizaje con rebote
            m.listo();
          }
        }
      }

      // ---- giro (mirar a un lado) ----
      this.mirada.obj = r.lado === "izq" ? -1 : 1;
      const mir = this.mirada.paso(dt);
      const escX = Math.abs(mir) < 0.08 ? 0.08 * Math.sign(mir || 1) : mir;

      // ---- vuelo: inclinación y aleteo ----
      this.inclinacion.obj = volando ? limitar(vx / 55, -16, 16) * (r.lado === "izq" ? -1 : 1) : 0;
      const inc = this.inclinacion.paso(dt);
      this.recoger.obj = volando ? 1 : 0;
      const rec = this.recoger.paso(dt);
      const planeo = volando && m && m.dist > 320 && m.t > 0.35 && m.t < 0.72;
      this.pesoAleteo.obj = volando && !planeo ? 1 : 0;
      const pa = this.pesoAleteo.paso(dt);
      this.faseAleteo += dt * (volando ? 2 * Math.PI * 7.5 : 0);
      // bajada rápida, subida lenta (como un ave real)
      const ciclo = (Math.sin(this.faseAleteo) + 1) / 2;
      const aleteo = -62 * Math.pow(ciclo, 0.6) + 14;

      // ---- objetivo del ala según el estado ----
      let alaObj = Math.sin(T * 1.8) * 2; // respiración
      if (planeo) alaObj = -38;
      else if (e.has("senalando")) alaObj = -80 + Math.sin(T * 6) * 4;
      else if (e.has("saludando")) alaObj = -45 + Math.sin(T * 13) * 32;
      else if (e.has("pensando")) alaObj = -18 + Math.sin(T * 4) * 8;
      else if (e.has("hablando")) alaObj = Math.sin(T * 3.1) * 6 - this.vozNivel * 10;
      this.ala.obj = alaObj;
      const alaQuieta = this.ala.paso(dt);
      const ala = lerp(alaQuieta, aleteo, pa);

      // ---- cabeza ----
      this.proxMirada -= dt;
      if (this.proxMirada <= 0) { this.miradaAzar = (Math.random() - 0.5) * 34; this.proxMirada = 0.6 + Math.random() * 2.2; }
      let cab = this.miradaAzar * 0.6 + this.ojoObj.y * 5;
      let cx = 0, cy = 0;
      if (e.has("pensando")) { cab = -14 + Math.sin(T * 1.5) * 3; }
      if (e.has("escuchando")) { cab = 12 + Math.sin(T * 2) * 2; }
      if (e.has("hablando")) { cab += this.vozNivel * 7 + Math.sin(T * 4.3) * 2.5; }
      if (e.has("senalando")) { cab = 5; }
      if (e.has("picoteando")) { const pk = Math.max(0, Math.sin(T * 9)); cab = 40 * Math.pow(pk, 3); cx = 4 * pk; cy = 10 * Math.pow(pk, 3); }
      if (e.has("acicalando")) { cab = -42 + Math.sin(T * 14) * 4; cx = -14; cy = 8; }
      if (e.has("mirando")) { cab = Math.sin(T * 2.2) * 16; }
      if (caminando) { const f = (this.fasePaso / 2) % 1; cx = f < 0.35 ? lerp(-3, 6, f / 0.35) : lerp(6, -3, (f - 0.35) / 0.65); cab += 4; } // cabeceo de paloma
      if (volando) { cab = -inc * 0.5 - 4; }
      this.cabeza.obj = cab; this.cabezaX.obj = cx; this.cabezaY.obj = cy;
      const cabA = this.cabeza.paso(dt), cabX = this.cabezaX.paso(dt), cabY = this.cabezaY.paso(dt);

      // ---- gestos con el ala mientras habla ----
      if (e.has("hablando") && !volando) {
        this.proxGesto -= dt;
        if (this.proxGesto <= 0) { this.ala.empujar(-320); this.cabeza.empujar(-70); this.squash.empujar(1.5); this.proxGesto = 1.1 + Math.random() * 1.6; }
      }

      // ---- saltito de vez en cuando cuando está quieto ----
      const quieto = !m && !r.ocupado && e.size === 0 && r.panel.hidden;
      if (quieto && this.saltoY === 0 && this.saltoV === 0) {
        this.proxSalto -= dt;
        if (this.proxSalto <= 0 && this.preSalto <= 0) { this.preSalto = 0.14; this.squash.obj = 0.84; }
      }
      if (this.preSalto > 0) {
        this.preSalto -= dt;
        if (this.preSalto <= 0) { this.squash.obj = 1; this.squash.empujar(5); this.saltoV = -230; this.cola.empujar(-140); this.proxSalto = 6 + Math.random() * 8; if (Math.random() < 0.35) r.lado = r.lado === "izq" ? "der" : "izq"; }
      }
      if (this.saltoV !== 0 || this.saltoY < 0) {
        this.saltoV += 1100 * dt;
        this.saltoY += this.saltoV * dt;
        if (this.saltoY >= 0) { this.saltoY = 0; this.saltoV = 0; this.squash.empujar(-6); this.cola.empujar(130); if (r.enCasa) r.lado = "izq"; }
      }

      // ---- cola (con inercia) ----
      this.proxColeteo -= dt;
      if (this.proxColeteo <= 0 && !volando) { this.cola.empujar(-150); this.proxColeteo = 3 + Math.random() * 5; }
      this.cola.obj = volando ? -8 : caminando ? Math.sin(this.fasePaso * Math.PI * 2) * 4 : 0;
      const cola = this.cola.paso(dt);

      // ---- cuerpo: respiración, pasos y aplastar/estirar ----
      if (this.preSalto <= 0 && !(m && m.vuelo && m.t < 0)) this.squash.obj = 1;
      const sq = this.squash.paso(dt);
      let bob = Math.sin(T * 2.1) * 0.8;
      if (caminando) bob = -Math.abs(Math.sin(this.fasePaso * Math.PI)) * 3.5;
      if (volando) bob = Math.sin(this.faseAleteo) * 2.2 * pa;
      if (e.has("hablando")) bob -= this.vozNivel * 3;
      bob += this.saltoY;
      const balanceo = volando ? 0 : Math.sin(T * 0.9) * 2.2 + (e.has("hablando") ? Math.sin(T * 2.6) * 1.5 : 0);

      // ---- patas ----
      const paso = caminando ? Math.sin(this.fasePaso * Math.PI) * 20 : 0;

      // ---- pico y ojos ----
      let voz = this.vozNivel;
      if (e.has("sin-voz")) voz = (Math.sin(T * 26) + 1) / 2 * 0.8;
      this.pico.obj = voz * 24;
      const pico = this.pico.paso(dt);
      this.pupX.obj = this.ojoObj.x; this.pupY.obj = this.ojoObj.y;
      if (e.has("pensando")) { this.pupX.obj = 1; this.pupY.obj = -2; }
      const px = this.pupX.paso(dt), py = this.pupY.paso(dt);

      this.proxParpadeo -= dt;
      if (this.proxParpadeo <= 0) { this.parpadeo = 0.16; this.proxParpadeo = Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 4; }
      let lid = 0;
      if (this.parpadeo > 0) { this.parpadeo -= dt; lid = Math.sin(limitar(1 - this.parpadeo / 0.16, 0, 1) * Math.PI); }
      if (e.has("escuchando")) lid = Math.min(lid, 0);

      this.sombraOp.obj = volando ? 0.35 : this.saltoY < -2 ? 0.7 : 1;
      const so = this.sombraOp.paso(dt);

      // ---- aplicar al dibujo ----
      const E = this.el;
      E.svg.style.transform = `scaleX(${escX.toFixed(3)})`;
      E.arco.style.transform = `rotate(${(inc * (r.lado === "izq" ? -1 : 1)).toFixed(2)}deg)`;
      const sx = 1 + (1 - sq) * 0.7;
      E.todo.setAttribute("transform", `translate(0 ${bob.toFixed(2)}) rotate(${balanceo.toFixed(2)} 60 104) translate(60 106) scale(${sx.toFixed(3)} ${sq.toFixed(3)}) translate(-60 -106)`);
      const alaAtras = lerp(alaQuieta * 0.3, aleteo * 1.2 - 8, pa) + (planeo ? -34 : 0);
      E.alaAtras.setAttribute("transform", `rotate(${alaAtras.toFixed(2)} 48 60)`);
      E.cabeza.setAttribute("transform", `translate(${cabX.toFixed(2)} ${cabY.toFixed(2)}) rotate(${cabA.toFixed(2)} 74 58)`);
      E.ala.setAttribute("transform", `rotate(${ala.toFixed(2)} 46 62)`);
      E.cola.setAttribute("transform", `rotate(${cola.toFixed(2)} 36 78)`);
      const recT = `translate(${(4 * rec).toFixed(2)} ${(-7 * rec).toFixed(2)})`;
      E.pataA.setAttribute("transform", `${recT} rotate(${(paso + rec * 35).toFixed(2)} 56 90)`);
      E.pataB.setAttribute("transform", `${recT} rotate(${(-paso + rec * 35).toFixed(2)} 66 90)`);
      E.picoInf.setAttribute("transform", `rotate(${pico.toFixed(2)} 98 47)`);
      E.parpado.setAttribute("transform", `translate(0 34.5) scale(1 ${lid.toFixed(3)}) translate(0 -34.5)`);
      const pupT = `translate(${px.toFixed(2)} ${py.toFixed(2)})`;
      E.pupila.setAttribute("transform", pupT);
      E.brillo.setAttribute("transform", pupT);
      E.ojoBlanco.setAttribute("transform", e.has("escuchando") ? "translate(88 41) scale(1.12) translate(-88 -41)" : "");
      E.sombra.setAttribute("transform", `translate(60 112) scale(${(0.6 + 0.4 * so).toFixed(3)}) translate(-60 -112)`);
      E.sombra.style.opacity = (0.14 * so).toFixed(3);
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

      this.estados = new Set();
      this.lado = "izq";
      this.crear();
      this.anim = new Animador(this);
      this.voz = new Voz((n) => (this.anim.vozNivel = n));
      this.voz.alCambiarLista = () => this.armarSelectorVoces();
      this.armarSelectorVoces();
      this.voz.precargar(K.mascota.saludo); // mientras la persona ve la bienvenida
      this.prepararMicrofono();
      this.ojosQueSiguen();
      this.colocar(this.x, this.y);

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
          <button class="r-icono r-btn-ajustes" type="button" title="Elegir la voz de Rufino" aria-expanded="false">⚙️</button>
          <button class="r-icono r-btn-voz" type="button" title="Silenciar la voz" aria-pressed="true">🔊</button>
          <button class="r-icono r-btn-cerrar" type="button" title="Cerrar">✕</button>
        </header>
        <div class="r-ajustes" hidden>
          <label for="r-voz-sel">Voz de Rufino</label>
          <select id="r-voz-sel" class="r-voz-sel"></select>
          <small>${HAY_SERVIDOR ? "Al elegir una, Rufino te habla para que la escuches. Las del navegador cambian según el navegador: en Microsoft Edge hay voces \"Natural\" muy buenas." : "Las voces de Gemini se activan con la app publicada en Vercel."}</small>
        </div>
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
      $(".r-btn-ajustes", panel).addEventListener("click", (e) => {
        const aj = $(".r-ajustes", panel);
        aj.hidden = !aj.hidden;
        e.currentTarget.setAttribute("aria-expanded", String(!aj.hidden));
      });
      $(".r-voz-sel", panel).addEventListener("change", (e) => {
        this.voz.cambiarVoz(e.target.value);
        this.decir("Hola, soy Rufino. ¿Te gusta cómo sueno con esta voz?");
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

    armarSelectorVoces() {
      const sel = $(".r-voz-sel", this.panel);
      if (!sel || !this.voz) return;
      const gemini = HAY_SERVIDOR ? VOCES.filter((v) => v.id !== "navegador") : [];
      const nav = this.voz.vocesNavegador || [];
      const limpiar = (n) => n.replace(/^Microsoft\s+/i, "").replace(/\s*Online\s*\(Natural\)/i, " (Natural)").replace(/\s+-\s+.*$/, "");
      sel.innerHTML =
        (gemini.length ? `<optgroup label="Voces de Gemini (más naturales)">${gemini.map((v) => `<option value="${v.id}">${v.nombre}</option>`).join("")}</optgroup>` : "") +
        `<optgroup label="Voces de este navegador"><option value="navegador">Automática (la mejor disponible)</option>${nav
          .map((v) => `<option value="nav:${v.name.replace(/"/g, "&quot;")}">${limpiar(v.name)} · ${v.lang}${/natural|online|neural/i.test(v.name) ? " ★" : ""}</option>`)
          .join("")}</optgroup>`;
      const pref = leerPref("rufino-voz-nav", "");
      sel.value = this.voz.vozElegida !== "navegador" && HAY_SERVIDOR ? this.voz.vozElegida : pref ? "nav:" + pref : "navegador";
      if (!sel.value) sel.value = "navegador";
    }

    // ---------- Movimiento ----------
    get tam() { return innerWidth < 640 ? 84 : 112; }
    casa() { return { x: innerWidth - this.tam - (innerWidth < 640 ? 8 : 18), y: innerHeight - this.tam - (innerWidth < 640 ? 6 : 12) }; }

    colocar(x, y) {
      this.root.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
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
      if (Math.hypot(x - this.x, y - this.y) < 3) return;
      this.mirar(x < this.x ? "izq" : "der");
      this.estado(modo === "vuelo" ? "volando" : "caminando", true);
      await this.anim.mover(x, y, modo);
      this.estado("volando", false);
      this.estado("caminando", false);
      this.ajustarBurbuja();
    }

    mirar(lado) { this.lado = lado; }
    estado(nombre, on) {
      if (on) this.estados.add(nombre); else this.estados.delete(nombre);
      this.root.classList.toggle(nombre, on); // para el CSS del globo y del micrófono
    }

    async volverACasa(inmediato) {
      const c = this.casa();
      this.enCasa = true;
      if (inmediato) return this.colocar(c.x, c.y);
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
      this.colocar(innerWidth + 120, Math.max(90, innerHeight * 0.25));
      await esperar(250);
      const centroX = Math.min(innerWidth - this.tam - 20, innerWidth * (innerWidth < 640 ? 0.5 : 0.62));
      await this.moverA(centroX, Math.max(90, innerHeight * 0.32), "vuelo");
      this.mirar("izq");
      this.estado("saludando", true);
      setTimeout(() => this.estado("saludando", false), 1600);
      const saludo = K.mascota.saludo;
      const msg = this.agregarMensaje("bot", saludo);
      await this.decir(saludo, { alEmpezar: () => { this.mostrarBurbuja(saludo); msg.textContent = saludo; } });
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

      this.estado("pensando", false);
      const burbujaResp = escribiendo; // se completa cuando Rufino empieza a hablar
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
        if (innerWidth < 640) this.burbujaPendiente = r.respuesta;
      }
      this.pintarSugerencias(r.sugerencias);
      await Promise.all([this.decir(r.respuesta, { alEmpezar: () => {
        this.escribirDeAPoco(burbujaResp, r.respuesta);
        if (this.burbujaPendiente) { this.mostrarBurbuja(this.burbujaPendiente); this.burbujaPendiente = null; }
      } }), vuelo]);
      await esperar(1200);
      this.estado("senalando", false);
      if (!this.enCasa) await this.volverACasa();
      this.ocupado = false;
      this.setEstadoTexto("Asistente virtual de ViCa");
      if (porVoz && this.conversacionContinua) this.escuchar();
    }

    async preguntarGemini(texto, contexto) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
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

    async decir(texto, { alEmpezar } = {}) {
      this.estado("hablando", true);
      this.setEstadoTexto("hablando…");
      let avisado = false;
      const avisar = () => { if (!avisado) { avisado = true; alEmpezar?.(); } };
      const reserva = setTimeout(avisar, 4000); // nunca deja el texto escondido más de 4 s
      if (this.vozActiva) await this.voz.hablar(texto, avisar);
      else {
        avisar();
        this.estado("sin-voz", true);
        await esperar(Math.min(4500, 500 + texto.length * 40));
        this.estado("sin-voz", false);
      }
      clearTimeout(reserva);
      avisar();
      this.estado("hablando", false);
      this.setEstadoTexto("Asistente virtual de ViCa");
    }

    // Escribe el texto de a poco, al ritmo aproximado de la voz
    escribirDeAPoco(el, texto) {
      const palabras = texto.split(" ");
      const ms = Math.min(170, Math.max(60, 9000 / palabras.length)) * (this.vozActiva ? 1 : 0.45);
      let i = 0;
      el.classList.remove("r-escribiendo");
      el.textContent = "";
      clearInterval(el._tw);
      el._tw = setInterval(() => {
        el.textContent = palabras.slice(0, ++i).join(" ");
        this.mensajes.scrollTop = this.mensajes.scrollHeight;
        if (i >= palabras.length) clearInterval(el._tw);
      }, ms);
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
      await this.decir(consejo, { alEmpezar: () => this.mostrarBurbuja(consejo) });
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

    ojosQueSiguen() {
      let pend = false, px = 0, py = 0;
      addEventListener("pointermove", (e) => {
        px = e.clientX; py = e.clientY;
        if (pend) return;
        pend = true;
        requestAnimationFrame(() => {
          pend = false;
          const izq = this.lado === "izq";
          const ox = this.x + this.tam * (izq ? 0.27 : 0.73), oy = this.y + this.tam * 0.34;
          let dx = (px - ox) / 200, dy = (py - oy) / 200;
          if (izq) dx = -dx;
          const m = Math.hypot(dx, dy) || 1, k = Math.min(1, m);
          this.anim.ojoObj = { x: (dx / m) * k * 1.8, y: (dy / m) * k * 1.6 };
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
