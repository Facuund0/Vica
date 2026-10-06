// =============================================================
//  App ViCa — navegación, vistas e interacciones (demo, sin backend)
// =============================================================
(function () {
  const D = globalThis.VICA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const plata = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const planDe = (id) => D.planes.find((p) => p.id === id);
  const miPlan = planDe(D.usuario.plan);

  // ---------- Estado de la demo (se guarda en el navegador) ----------
  const CLAVE = "vica-demo-v1";
  const estadoInicial = () => ({ pagadas: [], votos: {}, inscripciones: [], asistencias: [], tramites: [], mensajes: {}, solicitud: null });
  let estado = estadoInicial();
  try { estado = { ...estado, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; } catch {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {} };

  const cuotasActuales = () =>
    D.cuotas.map((c) => {
      const p = estado.pagadas.find((x) => x.mes === c.mes);
      return p ? { ...c, estado: "Pagada", comprobante: p.comprobante } : c;
    });
  const pagadasTotal = () => D.usuario.cuotasPagadas + estado.pagadas.length;
  const proximaPendiente = () => cuotasActuales().find((c) => c.estado !== "Pagada");

  // ---------- Navegación ----------
  const VISTAS = [
    { grupo: "La cooperativa", id: "inicio", nombre: "Inicio", ico: "🏠" },
    { grupo: "La cooperativa", id: "nosotros", nombre: "Nosotros", ico: "🤝" },
    { grupo: "La cooperativa", id: "proyecto", nombre: "Cómo funciona", ico: "🧭" },
    { grupo: "La cooperativa", id: "planes", nombre: "Planes y financiación", ico: "📐" },
    { grupo: "La cooperativa", id: "cooperativismo", nombre: "Cooperativismo", ico: "⚖️" },
    { grupo: "La cooperativa", id: "transparencia", nombre: "Transparencia", ico: "📂" },
    { grupo: "La cooperativa", id: "noticias", nombre: "Noticias", ico: "📰" },
    { grupo: "La cooperativa", id: "asociarme", nombre: "Quiero asociarme", ico: "✍️" },
    { grupo: "La cooperativa", id: "contacto", nombre: "Contacto", ico: "✉️" },
    { grupo: "Mi espacio", id: "cuenta", nombre: "Mi cuenta", ico: "👤" },
    { grupo: "Mi espacio", id: "obra", nombre: "Avance de obra", ico: "🏗️" },
    { grupo: "Mi espacio", id: "pagos", nombre: "Pagos y cuotas", ico: "💳", badge: () => (proximaPendiente()?.estado === "Pendiente" ? "1" : "") },
    { grupo: "Mi espacio", id: "votaciones", nombre: "Votaciones", ico: "🗳️", badge: () => (estado.votos["barrio-norte"] ? "" : "1") },
    { grupo: "Mi espacio", id: "reuniones", nombre: "Reuniones", ico: "📅" },
    { grupo: "Mi espacio", id: "comunidad", nombre: "Comunidad", ico: "💬" },
    { grupo: "Mi espacio", id: "tramites", nombre: "Trámites", ico: "📄" },
    { grupo: "Mi espacio", id: "capacitacion", nombre: "Capacitación", ico: "🎓" },
    { grupo: "Mi espacio", id: "ayuda", nombre: "Ayuda para usar la app", ico: "🛟" },
    { grupo: "Gestión", id: "admin", nombre: "Panel administrativo", ico: "📊" },
  ];

  function pintarNav() {
    const actual = vistaActual();
    const grupos = [...new Set(VISTAS.map((v) => v.grupo))];
    $("#nav").innerHTML = grupos
      .map(
        (g) => `<div class="nav-grupo"><h3>${g}</h3>${VISTAS.filter((v) => v.grupo === g)
          .map((v) => {
            const b = v.badge ? v.badge() : "";
            return `<a class="nav-link ${v.id === actual ? "activo" : ""}" href="#${v.id}"><span class="ico">${v.ico}</span>${v.nombre}${b ? `<span class="badge">${b}</span>` : ""}</a>`;
          })
          .join("")}</div>`
      )
      .join("");
  }

  const vistaActual = () => {
    const id = (location.hash.slice(1).split("/")[0] || "inicio");
    return VISTAS.some((v) => v.id === id) ? id : "inicio";
  };

  const oyentes = [];
  function render() {
    const id = vistaActual();
    const vista = VISTAS_RENDER[id];
    const main = $("#contenido");
    main.innerHTML = `<div class="vista" data-vista="${id}">${vista.html()}${pie()}</div>`;
    vista.montar?.(main);
    $$(".barra > span[data-ancho]", main).forEach((b) => requestAnimationFrame(() => setTimeout(() => (b.style.width = b.dataset.ancho + "%"), 60)));
    $("[data-reiniciar]", main)?.addEventListener("click", () => {
      try { localStorage.removeItem(CLAVE); } catch {}
      estado = estadoInicial();
      toast("Se reinició la demostración.");
      render();
    });
    pintarNav();
    cerrarMenu();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    document.title = `${VISTAS.find((v) => v.id === id).nombre} · ViCa`;
    oyentes.forEach((f) => f(id));
  }

  const pie = () => `<footer class="pie"><span>ViCa Cooperativa de Vivienda Limitada · Sunchales, Santa Fe</span><span>© 2026 · Proyecto académico · Datos ilustrativos · <button type="button" data-reiniciar>Reiniciar demo</button></span></footer>`;

  // ---------- Utilidades de UI ----------
  let tToast;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(tToast);
    tToast = setTimeout(() => t.classList.remove("visible"), 3200);
  }
  function modal(html, alMontar) {
    const m = $("#modal");
    $(".modal-cuerpo", m).innerHTML = html;
    m.hidden = false;
    alMontar?.($(".modal-cuerpo", m));
    $(".modal-cerrar", m).focus();
  }
  function cerrarModal() { $("#modal").hidden = true; }
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" || e.target.closest(".modal-cerrar")) cerrarModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

  const barra = (pct) => `<div class="barra"><span data-ancho="${pct}"></span></div>`;
  const etapas = (lista, actual) =>
    `<div class="etapas">${lista
      .map((e, i) => `<div class="etapa ${i < actual ? "hecha" : i === actual ? "actual" : ""}"><div class="punto">${i < actual ? "✓" : i + 1}</div>${e}</div>`)
      .join("")}</div>`;
  const encabezado = (ceja, titulo, intro) => `<div class="ceja">${ceja}</div><h1>${titulo}</h1>${intro ? `<p class="intro">${intro}</p>` : ""}`;

  const casaSVG = (dorm) => `<svg viewBox="0 0 120 90" aria-hidden="true">
    <path d="M10 45 L60 10 L110 45" fill="none" stroke="#0c4168" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="22" y="42" width="76" height="42" rx="4" fill="#fff" stroke="#0c4168" stroke-width="3"/>
    <rect x="52" y="58" width="16" height="26" rx="2" fill="#4d9d28"/>
    ${[30, 79, 43, 92].slice(0, Math.max(1, dorm)).map((x) => `<rect x="${x === 92 ? 66 : x}" y="${x === 92 ? 46 : 52}" width="10" height="10" rx="2" fill="#9ec3dc"/>`).join("")}
  </svg>`;

  // ---------- Vistas ----------
  const VISTAS_RENDER = {
    inicio: {
      html: () => {
        const pend = proximaPendiente();
        const yaVoto = !!estado.votos["barrio-norte"];
        return `
        <section class="hero">
          <div>
            <div class="ceja">Sunchales · Santa Fe</div>
            <h1>Construir juntos.<br><span>Vivir mejor.</span></h1>
            <p class="intro" style="margin-bottom:0">${D.cooperativa.nombre} facilita el acceso a la vivienda mediante organización, participación y financiación accesible.</p>
            <p class="frase">“${D.cooperativa.frase}”</p>
            <div class="botones">
              <a class="btn btn-primario" href="#planes">Ver planes de vivienda</a>
              <a class="btn btn-secundario" href="#nosotros">Conocé ViCa</a>
            </div>
          </div>
          <div class="hero-logo"><img src="img/logo.png" alt="Logo ViCa"><p class="suave">Una comunidad organizada para hacer realidad el sueño de la vivienda propia.</p></div>
        </section>
        <div class="franja">
          <div><strong>ViCa</strong><span>Cooperativa de Vivienda Limitada</span></div>
          <div><strong>Ley 20.337</strong><span>Marco legal cooperativo</span></div>
          <div><strong>${D.admin.asociados} asociados</strong><span>Desde el ${D.cooperativa.constitucion}</span></div>
        </div>

        <h2>Hola, ${D.usuario.nombreCorto}. Esto es lo importante hoy</h2>
        <div class="grilla">
          <a class="tarjeta click" href="#obra"><div class="icono">🏗️</div><h3>Tu vivienda</h3><p class="suave">Modelo ${miPlan.nombre} · lote ${D.usuario.lote}</p><div style="margin-top:12px">${barra(D.usuario.avance)}</div><p class="suave" style="margin-top:6px">${D.usuario.avance}% de avance</p></a>
          <a class="tarjeta click" href="#pagos"><div class="icono">💳</div><h3>Próxima cuota</h3>${pend ? `<p class="dato-grande">${plata(miPlan.cuota)}</p><p class="suave">${pend.mes} · vence ${pend.vence}</p>` : `<p class="suave">Estás al día. ¡Gracias!</p>`}</a>
          <a class="tarjeta click" href="#votaciones"><div class="icono">🗳️</div><h3>Votación abierta</h3><p class="suave">${D.votaciones[0].titulo}</p><p style="margin-top:8px">${yaVoto ? '<span class="chip chip-ok">Ya votaste</span>' : `<span class="chip chip-pend">Cierra el ${D.votaciones[0].cierre}</span>`}</p></a>
          <a class="tarjeta click" href="#reuniones"><div class="icono">📅</div><h3>Próxima reunión</h3><p class="suave">${D.reuniones[0].titulo}</p><p class="suave">${D.reuniones[0].fecha} · ${D.reuniones[0].hora} hs</p></a>
        </div>

        <h2>Novedades</h2>
        <div class="grilla">${D.noticias.slice(0, 3).map((n) => `<article class="tarjeta"><span class="chip chip-info">${n.fecha}</span><h3 style="margin-top:10px">${n.titulo}</h3><p class="suave">${n.texto}</p></article>`).join("")}</div>`;
      },
    },

    nosotros: {
      html: () => `
        ${encabezado("Quiénes somos", "Una vivienda también es un proyecto colectivo.", "ViCa nace en Sunchales, capital nacional del cooperativismo, con una finalidad social: organizar a sus asociados para facilitar el acceso a soluciones habitacionales dignas, accesibles y sustentables.")}
        <div class="grilla-2">
          <div class="tarjeta tarjeta-azul"><h3>Misión</h3><p>${D.cooperativa.mision}</p></div>
          <div class="tarjeta tarjeta-azul"><h3>Visión</h3><p>${D.cooperativa.vision}</p></div>
        </div>
        <h2>Objeto social</h2>
        <div class="tarjeta"><p>${D.cooperativa.objetoSocial}</p></div>
        <h2>Nuestros valores</h2>
        <div class="grilla">${D.cooperativa.valores.map((v) => `<div class="tarjeta"><div class="icono">${v.icono}</div><h3>${v.nombre}</h3><p class="suave">${v.texto}</p></div>`).join("")}</div>
        <h2>Organigrama</h2>
        <div class="grilla-2" id="organigrama">
          <div class="organigrama"><img src="img/organigrama.jpg" alt="Organigrama: Asamblea de asociados, Consejo de administración, Síndico, Coordinación general y departamentos de asociados, producción de obras y finanzas. Staff: auditor externo, RRHH, marketing, cooperativa de trabajo, higiene y seguridad." loading="lazy"></div>
          <div class="tarjeta">
            <h3>Planta permanente</h3><p class="suave" style="margin-bottom:12px">${D.organigrama.plantaPermanente.join(" · ")}</p>
            <h3>Línea staff</h3><p class="suave">${D.organigrama.staff.join(" · ")}. Brindan asesoramiento especializado y transversal a toda la organización.</p>
            <p class="nota">Constituida el ${D.cooperativa.constitucion}. Cuenta con manual de funciones con la finalidad y requisitos de cada puesto.</p>
          </div>
        </div>`,
    },

    proyecto: {
      html: () => `
        ${encabezado("Nuestro proyecto", "Del aporte individual a un objetivo común.", D.cooperativa.queHace)}
        <div class="grilla">${D.proceso.map((p) => `<div class="tarjeta"><div class="icono" style="background:var(--verde);color:#fff;font-weight:800">${p.n}</div><h3>${p.titulo}</h3><p class="suave">${p.texto}</p></div>`).join("")}</div>
        <h2>Proyecto en marcha: ${D.obra.nombre}</h2>
        <div class="tarjeta">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><p><strong>${D.obra.viviendas} viviendas</strong> · etapa actual: <strong>${D.etapasObra[D.obra.etapa]}</strong></p><p class="suave">Entrega estimada: ${D.obra.entregaEstimada}</p></div>
          <div style="margin-top:12px">${barra(D.obra.avance)}</div><p class="suave" style="margin-top:6px">Avance general ${D.obra.avance}%</p>
          ${etapas(D.etapasObra, D.obra.etapa)}
          <div class="botones" style="margin-top:14px"><a class="btn btn-azul btn-chico" href="#obra">Ver el seguimiento completo</a></div>
        </div>
        <h2>Construcción sustentable</h2>
        <div class="grilla">
          <div class="tarjeta"><div class="icono">☀️</div><h3>Eficiencia energética</h3><p class="suave">Orientación solar, aislación térmica y preinstalación para termotanque solar.</p></div>
          <div class="tarjeta"><div class="icono">🔁</div><h3>Cooperación entre cooperativas</h3><p class="suave">La obra la realiza una cooperativa de trabajo local, fortaleciendo el desarrollo de Sunchales.</p></div>
          <div class="tarjeta"><div class="icono">🦺</div><h3>Higiene y seguridad</h3><p class="suave">Controles conforme a la Ley 19.587 y la Ley 24.557 de Riesgos del Trabajo.</p></div>
        </div>`,
    },

    planes: {
      html: () => `
        ${encabezado("Planes y financiación", "Cuotas pensadas para acompañar el proyecto.", `Tres modelos de vivienda con financiación propia en sistema ${D.financiacion.sistema.toLowerCase()} y una tasa de ${D.financiacion.tna}.`)}
        <div class="grilla">${D.planes.map((p) => `
          <div class="tarjeta" id="plan-${p.id}">
            <div class="plan-casa">${casaSVG(p.dormitorios)}</div>
            <span class="chip chip-info">${p.tipo}</span>
            <h3 style="margin-top:8px">Modelo ${p.nombre}</h3>
            <p class="suave">${p.m2} m² · ${p.banos} ${p.banos > 1 ? "baños" : "baño"}</p>
            <p class="suave" style="margin:8px 0">${p.descripcion}</p>
            <p class="suave">Valor de referencia ${plata(p.valor)}</p>
            <p class="precio">${plata(p.cuota)} <small class="suave">x ${p.cuotas}</small></p>
            <button class="btn btn-secundario btn-chico" style="margin-top:10px" data-simular="${p.id}" type="button">Simular este plan</button>
          </div>`).join("")}</div>

        <h2>Simulador de cuotas</h2>
        <div class="tarjeta simulador" id="simulador">
          <div>
            <label for="sim-plan">Modelo</label>
            <select id="sim-plan">${D.planes.map((p) => `<option value="${p.id}">${p.nombre} · ${p.tipo}</option>`).join("")}<option value="otro">Otro monto</option></select>
            <label for="sim-monto">Monto a financiar</label>
            <input id="sim-monto" type="number" min="1000000" step="500000" value="${D.financiacion.ejemplo.valor}">
            <label for="sim-plazo">Plazo: <span id="sim-plazo-txt"></span></label>
            <select id="sim-plazo">${D.financiacion.plazos.map((n) => `<option value="${n}" ${n === 120 ? "selected" : ""}>${n} cuotas (${n / 12} años)</option>`).join("")}</select>
            <p class="nota">${D.financiacion.aclaracion}</p>
          </div>
          <div>
            <div class="resultado-sim">
              <small>Cuota mensual estimada</small>
              <div class="monto" id="sim-cuota"></div>
              <div class="reparto"><span id="sim-cap"></span><span id="sim-int"></span></div>
              <small id="sim-detalle"></small>
            </div>
            <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr></thead><tbody id="sim-tabla"></tbody></table></div>
          </div>
        </div>`,
      montar: (el) => {
        const sp = $("#sim-plan", el), sm = $("#sim-monto", el), sz = $("#sim-plazo", el);
        sp.value = "ceibo";
        const calc = () => {
          const monto = Math.max(0, +sm.value || 0), n = +sz.value, i = D.TNA / 12;
          const c = D.cuotaFrancesa(monto, n);
          const total = c * n, interes = total - monto;
          $("#sim-cuota", el).textContent = plata(c);
          $("#sim-cap", el).style.width = (monto / total) * 100 + "%";
          $("#sim-int", el).style.width = (interes / total) * 100 + "%";
          $("#sim-detalle", el).textContent = `Total a pagar ${plata(total)} · capital ${plata(monto)} (verde) · interés ${plata(interes)} (celeste)`;
          let saldo = monto, filas = "";
          for (let k = 1; k <= Math.min(6, n); k++) {
            const int = saldo * i, cap = c - int;
            saldo -= cap;
            filas += `<tr><td>${k}</td><td>${plata(cap)}</td><td>${plata(int)}</td><td>${plata(saldo)}</td></tr>`;
          }
          $("#sim-tabla", el).innerHTML = filas + `<tr><td colspan="4" class="suave">… y así hasta la cuota ${n}. En el sistema francés la cuota es fija: al principio pagás más interés y al final más capital.</td></tr>`;
        };
        sp.addEventListener("change", () => { const p = planDe(sp.value); if (p) { sm.value = p.valor; sz.value = p.cuotas; } calc(); });
        sm.addEventListener("input", () => { sp.value = "otro"; calc(); });
        sz.addEventListener("change", calc);
        $$("[data-simular]", el).forEach((b) => b.addEventListener("click", () => {
          sp.value = b.dataset.simular; sp.dispatchEvent(new Event("change"));
          resaltar("simulador");
        }));
        calc();
      },
    },

    cooperativismo: {
      html: () => `
        ${encabezado("Cooperativismo", "Personas organizadas para alcanzar un objetivo común.", "El modelo cooperativo pone en el centro a sus asociados y se apoya en la participación, la democracia, la solidaridad y la ayuda mutua. Sunchales es reconocida como la capital nacional del cooperativismo.")}
        <h2>Los siete principios cooperativos</h2>
        <div class="grilla">${D.principios.map((p, i) => `<div class="tarjeta"><div class="icono" style="font-weight:800;color:var(--verde)">${i + 1}</div><h3>${p}</h3></div>`).join("")}</div>
        <h2>¿Cómo se organiza una cooperativa?</h2>
        <div class="grilla">
          <div class="tarjeta"><div class="icono">⚖️</div><h3>Asamblea de asociados</h3><p class="suave">Es el órgano máximo. Cada asociado tiene un voto, sin importar su aporte.</p></div>
          <div class="tarjeta"><div class="icono">🏛️</div><h3>Consejo de administración</h3><p class="suave">Elegido por la asamblea, dirige las operaciones y representa a la cooperativa.</p></div>
          <div class="tarjeta"><div class="icono">🔎</div><h3>Sindicatura</h3><p class="suave">El síndico fiscaliza la administración y vela por el cumplimiento de la ley y el estatuto.</p></div>
          <div class="tarjeta"><div class="icono">📚</div><h3>Educación cooperativa</h3><p class="suave">La formación de asociados es parte de la vida de la cooperativa.</p></div>
        </div>
        <div class="aviso">📘 Las cooperativas en Argentina se rigen por la Ley 20.337 y son registradas y controladas por el INAES.</div>`,
    },

    transparencia: {
      html: () => `
        ${encabezado("Transparencia", "Información siempre disponible.", "Estatuto, actas, balances y autoridades a disposición de todos los asociados.")}
        <h2>Documentación institucional</h2>
        <div class="lista">${D.documentosPublicos.map((d) => `<div class="item"><div class="icono" style="margin:0">📄</div><div class="cuerpo"><h3>${d.nombre}</h3><p class="suave">${d.detalle}</p></div><div class="acciones"><button class="btn btn-secundario btn-chico" data-doc type="button">Ver</button></div></div>`).join("")}</div>
        <h2>Autoridades</h2>
        <div class="tarjeta" id="autoridades"><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Cargo</th><th>Nombre</th></tr></thead><tbody>${D.autoridades.map((a) => `<tr><td>${a.cargo}</td><td>${a.nombre}</td></tr>`).join("")}</tbody></table></div><p class="nota">Consejo de Administración electo en la asamblea constitutiva del ${D.cooperativa.constitucion}. Nombres ficticios.</p></div>
        <h2>Marco normativo</h2>
        <div class="tarjeta"><ul style="padding-left:18px">${D.normativa.map((n) => `<li>${n}</li>`).join("")}</ul></div>`,
      montar: (el) => $$("[data-doc]", el).forEach((b) => b.addEventListener("click", () => toast("Documento de demostración: en la versión real se abre el PDF."))),
    },

    noticias: {
      html: () => `
        ${encabezado("Noticias y novedades", "Lo que pasa en ViCa.")}
        <div class="lista">${D.noticias.map((n) => {
          const [d, m] = n.fecha.split("/");
          const mes = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+m];
          return `<article class="item"><div class="fecha">${d}<small>${mes}</small></div><div class="cuerpo"><h3>${n.titulo}</h3><p class="suave">${n.texto}</p></div></article>`;
        }).join("")}</div>`,
    },

    asociarme: {
      html: () => estado.solicitud ? `
        ${encabezado("Formulario de asociación", "¡Tu solicitud quedó registrada!")}
        <div class="tarjeta" id="form-asociarse">
          <p>Número de solicitud <strong>${estado.solicitud.numero}</strong> · estado <span class="chip chip-pend">En revisión</span></p>
          <p class="suave" style="margin-top:8px">${esc(estado.solicitud.nombre)}, la cooperativa se va a contactar en los próximos días al correo ${esc(estado.solicitud.email)} para coordinar la entrevista y la firma de la documentación.</p>
          <p class="nota">El envío real de datos y documentación requiere backend y base de datos: aquí se muestra el flujo completo.</p>
          <button class="btn btn-secundario btn-chico" style="margin-top:14px" id="nueva-solicitud" type="button">Cargar otra solicitud</button>
        </div>` : `
        ${encabezado("¿Por qué asociarte?", "Sumate a una comunidad que construye junto a vos.", "Accedé a planes de vivienda con cuotas accesibles, participá de las decisiones y formá parte de una cooperativa democrática.")}
        <div class="tarjeta" style="margin-bottom:18px"><h3>Requisitos</h3><ul style="padding-left:18px" class="suave">${D.requisitosAsociarse.map((r) => `<li>${r}</li>`).join("")}</ul></div>
        <div class="pasos" id="pasos">${["Datos personales", "Documentación", "Elegí tu plan", "Confirmación"].map((p, i) => `<div class="paso" data-paso="${i}"><b>Paso ${i + 1}</b>${p}</div>`).join("")}</div>
        <form class="tarjeta" id="form-asociarse" novalidate>
          <div data-p="0">
            <div class="fila"><div><label for="a-nombre">Nombre completo</label><input id="a-nombre" required autocomplete="name"></div><div><label for="a-dni">DNI</label><input id="a-dni" required inputmode="numeric" pattern="\\d{7,8}" placeholder="Sin puntos"></div></div>
            <div class="fila"><div><label for="a-tel">Teléfono</label><input id="a-tel" required inputmode="tel"></div><div><label for="a-email">Correo electrónico</label><input id="a-email" type="email" required autocomplete="email"></div></div>
          </div>
          <div data-p="1" hidden>
            <p class="suave" style="margin-bottom:12px">Adjuntá tu DNI y un comprobante de ingresos.</p>
            <label for="a-doc-dni">DNI (frente y dorso)</label><input id="a-doc-dni" type="file" accept="image/*,.pdf">
            <label for="a-doc-ing">Comprobante de ingresos</label><input id="a-doc-ing" type="file" accept="image/*,.pdf">
            <p class="nota">Carga de archivos demostrativa: los archivos no se envían a ningún lado.</p>
          </div>
          <div data-p="2" hidden>
            <div class="grilla">${D.planes.map((p, i) => `<label class="opcion-plan"><input type="radio" name="a-plan" value="${p.id}" ${i === 1 ? "checked" : ""}><div class="tarjeta"><h3>${p.nombre}</h3><p class="suave">${p.tipo} · ${p.m2} m²</p><p class="precio" style="font-size:1.1rem">${plata(p.cuota)} x ${p.cuotas}</p></div></label>`).join("")}</div>
          </div>
          <div data-p="3" hidden><div id="a-resumen"></div><label class="opcion-voto" style="margin-top:12px"><input type="checkbox" id="a-acepto"> Declaro que los datos son correctos y acepto el estatuto y el reglamento de ViCa.</label></div>
          <div class="botones" style="margin-top:18px;justify-content:space-between">
            <button class="btn btn-secundario" type="button" id="a-atras">Atrás</button>
            <button class="btn btn-primario" type="submit" id="a-sig">Siguiente</button>
          </div>
        </form>`,
      montar: (el) => {
        $("#nueva-solicitud", el)?.addEventListener("click", () => { estado.solicitud = null; guardar(); render(); });
        const form = $("#form-asociarse", el);
        if (!form || form.tagName !== "FORM") return;
        let paso = 0;
        const mostrar = () => {
          $$("[data-p]", form).forEach((d) => (d.hidden = +d.dataset.p !== paso));
          $$(".paso", el).forEach((p, i) => (p.className = "paso " + (i < paso ? "hecho" : i === paso ? "activo" : "")));
          $("#a-atras", form).style.visibility = paso ? "visible" : "hidden";
          $("#a-sig", form).textContent = paso === 3 ? "Enviar solicitud" : "Siguiente";
          if (paso === 3) {
            const p = planDe($("input[name=a-plan]:checked", form).value);
            $("#a-resumen", form).innerHTML = `<h3>Revisá tus datos</h3><div class="comprobante"><div><span>Nombre</span><strong>${esc($("#a-nombre").value)}</strong></div><div><span>DNI</span><strong>${esc($("#a-dni").value)}</strong></div><div><span>Correo</span><strong>${esc($("#a-email").value)}</strong></div><div><span>Plan</span><strong>${p.nombre} · ${plata(p.cuota)} x ${p.cuotas}</strong></div></div>`;
          }
        };
        $("#a-atras", form).addEventListener("click", () => { paso--; mostrar(); });
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (paso === 0) {
            let ok = true;
            $$("[data-p='0'] input", form).forEach((i) => { const v = i.checkValidity() && i.value.trim(); i.classList.toggle("campo-error", !v); if (!v) ok = false; });
            if (!ok) return toast("Revisá los campos marcados en rojo.");
          }
          if (paso === 3) {
            if (!$("#a-acepto", form).checked) return toast("Tenés que aceptar la declaración para enviar.");
            estado.solicitud = { numero: "S-" + Math.floor(1000 + Math.random() * 9000), nombre: $("#a-nombre").value.trim(), email: $("#a-email").value.trim() };
            guardar(); render(); toast("¡Solicitud enviada!");
            return;
          }
          paso++; mostrar();
        });
        mostrar();
      },
    },

    contacto: {
      html: () => `
        ${encabezado("Contacto", "¿Querés conocer más sobre ViCa?", "Dejanos tu consulta y te respondemos a la brevedad.")}
        <div class="grilla-2">
          <div class="lista">
            <div class="item"><div class="icono" style="margin:0">📍</div><div class="cuerpo"><h3>Dirección</h3><p class="suave">${D.cooperativa.direccion}</p></div></div>
            <div class="item"><div class="icono" style="margin:0">✉️</div><div class="cuerpo"><h3>Correo</h3><p class="suave">${D.cooperativa.email}</p></div></div>
            <div class="item"><div class="icono" style="margin:0">📞</div><div class="cuerpo"><h3>Teléfono y WhatsApp</h3><p class="suave">${D.cooperativa.telefono} · WhatsApp ${D.cooperativa.whatsapp}</p></div></div>
            <div class="item"><div class="icono" style="margin:0">🕘</div><div class="cuerpo"><h3>Atención en la sede</h3><p class="suave">${D.cooperativa.horario}</p></div></div>
          </div>
          <form class="tarjeta" id="form-contacto">
            <label for="c-nombre">Nombre y apellido</label><input id="c-nombre" required>
            <label for="c-email">Correo electrónico</label><input id="c-email" type="email" required>
            <label for="c-msg">Consulta</label><textarea id="c-msg" required></textarea>
            <button class="btn btn-primario" type="submit">Enviar consulta</button>
          </form>
        </div>`,
      montar: (el) => $("#form-contacto", el).addEventListener("submit", (e) => { e.preventDefault(); e.target.reset(); toast("¡Gracias! Recibimos tu consulta (formulario demostrativo)."); }),
    },

    cuenta: {
      html: () => `
        ${encabezado("Mi cuenta", `${D.usuario.nombre} · Asociada N° ${D.usuario.numero}`, `Asociada desde ${D.usuario.ingreso}.`)}
        <div class="tarjeta" id="avance-vivienda">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
            <div><h3>Plan ${miPlan.tipo} — Modelo “${miPlan.nombre}”</h3><p class="suave">${D.obra.nombre} · lote ${D.usuario.lote}</p></div>
            <span class="chip chip-info">${D.etapasVivienda[D.usuario.etapa]}</span>
          </div>
          <p style="margin:14px 0 6px"><strong>Avance de tu vivienda: ${D.usuario.avance}%</strong></p>
          ${barra(D.usuario.avance)}
          ${etapas(D.etapasVivienda, D.usuario.etapa)}
        </div>
        <div class="grilla" style="margin-top:16px">
          <a class="tarjeta click" href="#pagos"><div class="icono">💳</div><h3>Cuotas</h3><p class="dato-grande">${pagadasTotal()} <small class="suave">de ${D.usuario.cuotasTotales}</small></p><p class="suave">${D.usuario.cuotasTotales - pagadasTotal()} pendientes · ${proximaPendiente() ? "próximo vencimiento " + proximaPendiente().vence : "al día"}</p></a>
          <div class="tarjeta" id="documentos"><div class="icono">📁</div><h3>Documentación</h3>${D.documentos.map((d) => `<p><button class="btn btn-secundario btn-chico" data-doc type="button" style="margin-top:6px">⬇ ${d.nombre}</button></p>`).join("")}</div>
          <div class="tarjeta"><div class="icono">📣</div><h3>Comunicaciones</h3>${D.comunicaciones.map((c) => `<p class="suave" style="margin-top:6px"><strong>${c.fecha}</strong> · ${c.texto}</p>`).join("")}</div>
        </div>`,
      montar: (el) => $$("[data-doc]", el).forEach((b) => b.addEventListener("click", () => toast("Documento de demostración: en la versión real se descarga el PDF."))),
    },

    obra: {
      html: () => `
        ${encabezado("Seguimiento de obra", `${D.obra.nombre} — ${D.obra.viviendas} viviendas`, `Ejecuta: ${D.obra.ejecuta}. Entrega estimada: ${D.obra.entregaEstimada}.`)}
        <div class="tarjeta">
          <p>Etapa actual: <strong>${D.etapasObra[D.obra.etapa]}</strong> · Avance general: <strong>${D.obra.avance}%</strong></p>
          <div style="margin-top:10px">${barra(D.obra.avance)}</div>
          ${etapas(D.etapasObra, D.obra.etapa)}
        </div>
        <div class="grilla-2" style="margin-top:18px">
          <div class="tarjeta" id="mapa-lotes">
            <h3>Estado de cada vivienda</h3><p class="suave" style="margin-bottom:12px">Tu vivienda es el lote ${D.usuario.lote} (borde dorado).</p>
            <div class="lotes">${D.obra.lotes.map((e, i) => `<div class="lote e${e} ${i + 1 === D.usuario.lote ? "mio" : ""}" title="Lote ${i + 1}: ${["Fundaciones", "Mampostería", "Techos"][e]}">${i + 1}</div>`).join("")}</div>
            <div class="leyenda"><span><i style="background:#b9c7cc"></i>Fundaciones</span><span><i style="background:var(--verde-2)"></i>Mampostería terminada</span><span><i style="background:var(--azul)"></i>Techos en curso</span></div>
          </div>
          <div class="tarjeta">
            <h3>Bitácora de obra</h3><p class="suave" style="margin-bottom:14px">Últimas novedades informadas por la comisión de obra.</p>
            <ul class="bitacora">${D.obra.bitacora.map((b) => `<li><b>${b.fecha}</b><br>${b.texto}</li>`).join("")}</ul>
          </div>
        </div>`,
    },

    pagos: {
      html: () => {
        const cuotas = cuotasActuales();
        const pend = proximaPendiente();
        return `
        ${encabezado("Pagos y cuotas", "Tu estado de cuenta", `Plan ${miPlan.nombre}: ${D.usuario.cuotasTotales} cuotas de ${plata(miPlan.cuota)} (sistema francés). Pagadas: ${pagadasTotal()}.`)}
        ${pend && pend.estado === "Pendiente" ? `
        <div class="tarjeta tarjeta-azul" style="margin-bottom:18px">
          <h3>Cuota de ${pend.mes.split(" ")[0].toLowerCase()}</h3>
          <p class="dato-grande" style="color:#fff">${plata(miPlan.cuota)}</p>
          <p>Vence el ${pend.vence}</p>
          <button class="btn btn-primario" style="margin-top:14px;position:relative;z-index:2" id="btn-pagar" type="button">Pagar cuota</button>
        </div>` : `<div class="aviso" style="margin-bottom:18px" id="btn-pagar">✅ Estás al día con tus cuotas. La próxima se habilita para pagar desde el día 1 del mes.</div>`}
        <div class="tarjeta"><div class="tabla-scroll"><table class="tabla"><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Importe</th><th>Estado</th><th></th></tr></thead><tbody>
          ${cuotas.map((c) => `<tr><td>${c.mes}</td><td>${c.vence}</td><td>${plata(miPlan.cuota)}</td><td><span class="chip ${c.estado === "Pagada" ? "chip-ok" : c.estado === "Pendiente" ? "chip-pend" : "chip-gris"}">${c.estado}</span></td><td>${c.comprobante ? `<button class="btn btn-secundario btn-chico" data-comp="${c.mes}" type="button">Comprobante</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="nota">Medios de pago: ${D.mediosPago.join(", ")}. Cobro real: requiere integración con una pasarela de pago.</p></div>`;
      },
      montar: (el) => {
        $("button#btn-pagar", el)?.addEventListener("click", () => {
          const pend = proximaPendiente();
          modal(`<h3>Pagar cuota de ${pend.mes}</h3><p class="dato-grande" style="margin:8px 0">${plata(miPlan.cuota)}</p>
            <label for="medio">Medio de pago</label><select id="medio">${D.mediosPago.map((m) => `<option>${m}</option>`).join("")}</select>
            <p class="nota" style="margin-top:0">Demostración: no se realiza ningún cobro.</p>
            <button class="btn btn-primario" style="width:100%;margin-top:10px" id="confirmar-pago" type="button">Confirmar pago</button>`, (m) => {
            $("#confirmar-pago", m).addEventListener("click", () => {
              const comp = `C-${D.usuario.numero}-${String(pagadasTotal() + 1).padStart(4, "0")}`;
              estado.pagadas.push({ mes: pend.mes, comprobante: comp, medio: $("#medio", m).value, fecha: new Date().toLocaleDateString("es-AR") });
              guardar();
              mostrarComprobante(pend.mes);
              render();
              toast("Pago registrado. Se generó el comprobante.");
            });
          });
        });
        $$("[data-comp]", el).forEach((b) => b.addEventListener("click", () => mostrarComprobante(b.dataset.comp)));
      },
    },

    votaciones: {
      html: () => {
        const v = D.votaciones[0], f = D.votaciones[1], mio = estado.votos[v.id];
        return `
        ${encabezado("Participación y votaciones", "Tu voz decide.", "En una cooperativa cada asociado tiene un voto. Acá podés participar de las decisiones abiertas y ver los resultados.")}
        <div class="tarjeta" id="votacion-activa">
          <span class="chip chip-pend">Abierta hasta el ${v.cierre}</span>
          <h3 style="margin-top:10px">${v.titulo}</h3>
          <p class="suave">${v.detalle}</p>
          ${mio ? `<div class="aviso">✅ Registraste tu voto: <strong>${mio.opcion}</strong> · constancia ${mio.constancia}. El resultado se publica al cierre.</div>` : `
          <form id="form-voto"><div class="opciones-voto">${v.opciones.map((o) => `<label class="opcion-voto"><input type="radio" name="voto" value="${o}" required> ${o}</label>`).join("")}</div>
          <button class="btn btn-primario" type="submit">Emitir mi voto</button></form>`}
          <p class="suave" style="margin-top:14px">Participación hasta ahora: ${mio ? v.participacion + 1 : v.participacion}%</p>${barra(mio ? v.participacion + 1 : v.participacion)}
          <div class="aviso">🔐 ${D.aclaracionVoto}</div>
        </div>
        <h2>Resultados</h2>
        <div class="tarjeta"><span class="chip chip-gris">Finalizada</span><h3 style="margin-top:10px">${f.titulo}</h3>
          ${f.resultado.map((r) => `<div class="resultado"><p class="suave">${r.opcion}</p><div class="barra"><span data-ancho="${r.porcentaje}">${r.porcentaje}%</span></div></div>`).join("")}
          <p class="nota">Participación: ${f.participacion}% de los asociados.</p></div>`;
      },
      montar: (el) => $("#form-voto", el)?.addEventListener("submit", (e) => {
        e.preventDefault();
        const o = $("input[name=voto]:checked", e.target)?.value;
        if (!o) return toast("Elegí una opción.");
        modal(`<h3>¿Confirmás tu voto?</h3><p class="suave" style="margin:8px 0 16px">Elegiste <strong>${o}</strong>. Una vez emitido no se puede cambiar.</p><div class="botones"><button class="btn btn-primario" id="si" type="button">Confirmar</button><button class="btn btn-secundario" id="no" type="button">Revisar</button></div>`, (m) => {
          $("#no", m).addEventListener("click", cerrarModal);
          $("#si", m).addEventListener("click", () => {
            estado.votos["barrio-norte"] = { opcion: o, constancia: "V-" + Math.random().toString(36).slice(2, 8).toUpperCase() };
            guardar(); cerrarModal(); render(); toast("¡Gracias por participar! Tu voto quedó registrado.");
          });
        });
      }),
    },

    reuniones: {
      html: () => `
        ${encabezado("Reuniones", "Agenda de la cooperativa", "Confirmá tu asistencia y agregá cada reunión a tu calendario.")}
        <div class="lista" id="lista-reuniones">${D.reuniones.map((r) => {
          const va = estado.asistencias.includes(r.id);
          const [, dm] = r.fecha.split(" ");
          const [d, m] = dm.split("/");
          return `<div class="item"><div class="fecha">${d}<small>${["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+m]}</small></div>
          <div class="cuerpo"><h3>${r.titulo}</h3><p class="suave">${r.fecha} · ${r.hora} hs · ${r.lugar}</p><p class="suave">${r.nota}</p></div>
          <div class="acciones"><button class="btn ${va ? "btn-azul" : "btn-primario"} btn-chico" data-asistir="${r.id}" type="button">${va ? "✓ Asistiré" : "Confirmar asistencia"}</button><button class="btn btn-secundario btn-chico" data-ics="${r.id}" type="button">📅 Agendar</button></div></div>`;
        }).join("")}</div>`,
      montar: (el) => {
        $$("[data-asistir]", el).forEach((b) => b.addEventListener("click", () => {
          const id = b.dataset.asistir;
          estado.asistencias = estado.asistencias.includes(id) ? estado.asistencias.filter((x) => x !== id) : [...estado.asistencias, id];
          guardar(); render();
          toast(estado.asistencias.includes(id) ? "Asistencia confirmada." : "Cancelaste tu asistencia.");
        }));
        $$("[data-ics]", el).forEach((b) => b.addEventListener("click", () => {
          const r = D.reuniones.find((x) => x.id === b.dataset.ics);
          const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ViCa//Demo//ES", "BEGIN:VEVENT", `UID:${r.id}@vica.coop.ar`, `DTSTART:${r.iso}`, `DURATION:PT2H`, `SUMMARY:${r.titulo} - ViCa`, `LOCATION:${r.lugar}`, `DESCRIPTION:${r.nota}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
          a.download = `vica-${r.id}.ics`;
          a.click();
          toast("Se descargó el evento para tu calendario.");
        }));
      },
    },

    comunidad: {
      html: () => `
        ${encabezado("Comunidad", "Espacios de conversación", "Los avisos oficiales de la cooperativa se distinguen visualmente de las conversaciones entre asociados.")}
        <div class="tarjeta chat">
          <div class="canales">${D.comunidad.map((c, i) => `<button class="canal ${i === 0 ? "activo" : ""}" data-canal="${c.id}" type="button">${c.oficial ? "📢 " : "# "}${c.nombre}<small>${c.miembros} miembros</small></button>`).join("")}</div>
          <div class="chat-cuerpo"><div class="chat-mensajes" id="chat-mensajes"></div>
            <form class="chat-form" id="chat-form"><input id="chat-input" placeholder="Escribí un mensaje…" autocomplete="off" maxlength="300"><button class="btn btn-primario" type="submit">Enviar</button></form>
          </div>
        </div>`,
      montar: (el) => {
        let canal = D.comunidad[0];
        const pintar = () => {
          const propios = estado.mensajes[canal.id] || [];
          const box = $("#chat-mensajes", el);
          box.innerHTML = [...canal.mensajes, ...propios].map((m) => `<div class="burbuja-chat ${canal.oficial ? "oficial" : ""} ${m.yo ? "yo" : ""}"><b>${esc(m.autor)}</b>${esc(m.texto)}<small>${esc(m.hora)}</small></div>`).join("");
          box.scrollTop = box.scrollHeight;
          const f = $("#chat-form", el);
          $("#chat-input", el).disabled = !!canal.oficial;
          $("#chat-input", el).placeholder = canal.oficial ? "Solo la cooperativa publica en este canal" : "Escribí un mensaje…";
          $("button", f).disabled = !!canal.oficial;
        };
        $$("[data-canal]", el).forEach((b) => b.addEventListener("click", () => {
          $$("[data-canal]", el).forEach((x) => x.classList.toggle("activo", x === b));
          canal = D.comunidad.find((c) => c.id === b.dataset.canal);
          pintar();
        }));
        $("#chat-form", el).addEventListener("submit", (e) => {
          e.preventDefault();
          const txt = $("#chat-input", el).value.trim();
          if (!txt) return;
          (estado.mensajes[canal.id] ||= []).push({ autor: "Vos", texto: txt, hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }), yo: true });
          guardar(); $("#chat-input", el).value = ""; pintar();
        });
        pintar();
      },
    },

    tramites: {
      html: () => {
        const lista = [...D.tramites, ...estado.tramites];
        return `
        ${encabezado("Trámites", "Gestioná sin moverte de tu casa", "Seguí el estado de cada trámite: " + D.estadosTramite.join(" → ") + ".")}
        <div class="lista">${lista.map((t) => `<div class="item"><div class="icono" style="margin:0">📄</div><div class="cuerpo"><h3>${esc(t.nombre)}</h3><p class="suave">N° ${t.id} · <span class="chip ${t.estado === 3 ? "chip-ok" : "chip-pend"}">${D.estadosTramite[t.estado]}</span></p><div class="pipeline">${D.estadosTramite.map((_, i) => `<span class="${i <= t.estado ? "on" : ""}"></span>`).join("")}</div></div></div>`).join("")}</div>
        <h2>Iniciar un trámite</h2>
        <form class="tarjeta" id="nuevo-tramite">
          <label for="t-tipo">Tipo de trámite</label><select id="t-tipo">${D.tiposTramite.map((t) => `<option>${t}</option>`).join("")}</select>
          <label for="t-det">Detalle (opcional)</label><textarea id="t-det" style="min-height:80px"></textarea>
          <button class="btn btn-primario" type="submit">Iniciar trámite</button>
        </form>`;
      },
      montar: (el) => $("#nuevo-tramite", el).addEventListener("submit", (e) => {
        e.preventDefault();
        estado.tramites.push({ id: "T-" + (140 + estado.tramites.length), nombre: $("#t-tipo", el).value, estado: 0 });
        guardar(); render(); toast("Trámite iniciado. Estado: Recibido.");
      }),
    },

    capacitacion: {
      html: () => `
        ${encabezado("Capacitación", "Aprender también es cooperar", "Talleres y cursos gratuitos para asociados.")}
        <div class="grilla">${D.capacitaciones.map((c) => {
          const ins = estado.inscripciones.includes(c.id);
          return `<div class="tarjeta"><div class="icono">🎓</div><span class="chip chip-info">${c.modalidad}</span><h3 style="margin-top:8px">${c.titulo}</h3><p class="suave">${c.fecha}</p><button class="btn ${ins ? "btn-azul" : "btn-primario"} btn-chico" style="margin-top:12px" data-ins="${c.id}" type="button">${ins ? "✓ Inscripta" : "Inscribirme"}</button></div>`;
        }).join("")}</div>`,
      montar: (el) => $$("[data-ins]", el).forEach((b) => b.addEventListener("click", () => {
        const id = b.dataset.ins;
        estado.inscripciones = estado.inscripciones.includes(id) ? estado.inscripciones.filter((x) => x !== id) : [...estado.inscripciones, id];
        guardar(); render(); toast(estado.inscripciones.includes(id) ? "¡Inscripción confirmada!" : "Cancelaste la inscripción.");
      })),
    },

    ayuda: {
      html: () => `
        ${encabezado("Ayuda para usar la app", "Te acompañamos paso a paso", "Si nunca usaste una aplicación como esta, no hay problema. Podés aprender a tu ritmo, en la sede o desde tu casa. Pensado especialmente para adultos mayores y para quien recién empieza con la tecnología.")}
        <div class="grilla">${D.ayuda.map((a) => `<div class="tarjeta"><div class="icono">${a.icono}</div><h3>${a.titulo}</h3><p class="suave">${a.texto}</p></div>`).join("")}</div>
        <h2>Atajos útiles</h2>
        <div class="grilla">
          <div class="tarjeta"><h3>🔠 Letra más grande</h3><p class="suave">Tocá el botón <strong>AA</strong> arriba a la derecha para agrandar toda la letra.</p></div>
          <div class="tarjeta"><h3>🐦 Preguntale a Rufino</h3><p class="suave">Tocá al hornero y escribile o hablale con el micrófono. Te responde y te lleva a donde necesites.</p></div>
          <div class="tarjeta"><h3>📞 Hablar con una persona</h3><p class="suave">${D.cooperativa.telefono} · WhatsApp ${D.cooperativa.whatsapp} · ${D.cooperativa.horario}.</p></div>
        </div>`,
    },

    admin: {
      html: () => `
        ${encabezado("Panel administrativo", "Vista de gestión (demostración)", "Así vería la información el personal de la cooperativa.")}
        <div class="kpis">
          <div class="tarjeta kpi"><small>Asociados</small><p class="dato-grande">${D.admin.asociados}</p></div>
          <div class="tarjeta kpi"><small>Viviendas en construcción</small><p class="dato-grande">${D.admin.enConstruccion}</p></div>
          <div class="tarjeta kpi"><small>Participación última votación</small><p class="dato-grande">${D.admin.participacion}%</p></div>
          <div class="tarjeta kpi"><small>Morosidad</small><p class="dato-grande">${D.admin.morosidad}%</p></div>
        </div>
        <h2>Asociados</h2>
        <div class="tarjeta">
          <input class="buscar" id="buscar" placeholder="Buscar por nombre o número…" aria-label="Buscar asociado">
          <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Nombre</th><th>N°</th><th>Ingreso</th><th>Plan</th><th>Estado</th></tr></thead><tbody id="tabla-asoc"></tbody></table></div>
          <p class="nota">Muestra parcial. El listado completo y la gestión por roles requieren backend y base de datos.</p>
        </div>`,
      montar: (el) => {
        const pintar = (q = "") => {
          const n = q.toLowerCase();
          $("#tabla-asoc", el).innerHTML = D.admin.listado
            .filter((a) => a.nombre.toLowerCase().includes(n) || a.numero.includes(n))
            .map((a) => `<tr><td>${a.nombre}</td><td>${a.numero}</td><td>${a.ingreso}</td><td>${a.plan}</td><td><span class="chip ${a.estado === "Al día" ? "chip-ok" : a.estado === "En revisión" ? "chip-info" : "chip-pend"}">${a.estado}</span></td></tr>`)
            .join("") || `<tr><td colspan="5" class="suave">Sin resultados.</td></tr>`;
        };
        $("#buscar", el).addEventListener("input", (e) => pintar(e.target.value));
        pintar();
      },
    },
  };

  function mostrarComprobante(mes) {
    const c = cuotasActuales().find((x) => x.mes === mes);
    const extra = estado.pagadas.find((x) => x.mes === mes);
    modal(`<h3>Comprobante de pago</h3>
      <div class="comprobante">
        <div><span>Cooperativa</span><strong>ViCa Coop. de Vivienda Ltda.</strong></div>
        <div><span>Asociada</span><strong>${D.usuario.nombre} (N° ${D.usuario.numero})</strong></div>
        <div><span>Concepto</span><strong>Cuota ${c.mes}</strong></div>
        <div><span>Importe</span><strong>${plata(miPlan.cuota)}</strong></div>
        ${extra ? `<div><span>Medio</span><strong>${extra.medio}</strong></div><div><span>Fecha</span><strong>${extra.fecha}</strong></div>` : ""}
        <div><span>Comprobante</span><strong>${c.comprobante}</strong></div>
      </div>
      <p class="nota">Comprobante demostrativo, sin validez fiscal.</p>
      <button class="btn btn-azul no-imprimir" type="button" onclick="window.print()">Imprimir</button>`);
  }

  function resaltar(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("resaltado");
    void el.offsetWidth;
    el.classList.add("resaltado");
    setTimeout(() => el.classList.remove("resaltado"), 2700);
    return el;
  }

  // ---------- Menú móvil, letra grande, splash ----------
  function cerrarMenu() { $("#sidebar").classList.remove("abierto"); $("#sidebar-fondo").classList.remove("visible"); }
  $("#btn-menu").addEventListener("click", () => { $("#sidebar").classList.toggle("abierto"); $("#sidebar-fondo").classList.toggle("visible"); });
  $("#sidebar-fondo").addEventListener("click", cerrarMenu);

  const btnLetra = $("#btn-letra");
  const setLetra = (on) => {
    document.documentElement.classList.toggle("letra-grande", on);
    btnLetra.setAttribute("aria-pressed", String(on));
    try { localStorage.setItem("vica-letra", on ? "1" : ""); } catch {}
  };
  try { setLetra(localStorage.getItem("vica-letra") === "1"); } catch {}
  btnLetra.addEventListener("click", () => setLetra(!document.documentElement.classList.contains("letra-grande")));

  const alIngresar = [];
  $("#btn-ingresar").addEventListener("click", () => {
    $("#splash").classList.add("oculto");
    setTimeout(() => $("#splash").remove(), 700);
    alIngresar.forEach((f) => f());
  });

  window.addEventListener("hashchange", render);
  render();

  // ---------- API pública para la mascota ----------
  window.ViCaApp = {
    vistas: VISTAS.map(({ id, nombre }) => ({ id, nombre })),
    vistaActual,
    ir(vista, elemento) {
      const cambiar = vista && vista !== vistaActual();
      if (cambiar) location.hash = vista;
      return new Promise((ok) => setTimeout(() => ok(elemento ? resaltar(elemento) : $("#contenido h1")), cambiar ? 450 : 50));
    },
    alCambiarVista: (f) => oyentes.push(f),
    alIngresar: (f) => ($("#splash") ? alIngresar.push(f) : f()),
    contexto() {
      const pend = proximaPendiente();
      return {
        vistaActual: vistaActual(),
        cuotasPagadas: pagadasTotal(),
        proximaCuota: pend ? `${pend.mes}, vence ${pend.vence}, ${plata(miPlan.cuota)} (${pend.estado.toLowerCase()})` : "al día",
        votoBarrioNorte: estado.votos["barrio-norte"]?.opcion || "todavía no votó",
        reunionesConfirmadas: estado.asistencias,
        capacitacionesInscripta: estado.inscripciones,
        tramitesNuevos: estado.tramites.map((t) => t.nombre),
        solicitudAsociacion: estado.solicitud ? estado.solicitud.numero : null,
      };
    },
    toast,
  };
})();
