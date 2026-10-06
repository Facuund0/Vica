// =============================================================
//  CONOCIMIENTO DE RUFINO, el hornero de ViCa
//  Se arma a partir de js/datos.js, así que si cambian los datos
//  Rufino se entera solo. Lo usan el modo guionado (navegador)
//  y Gemini (servidor, api/chat.js).
// =============================================================
(function () {
  const D = globalThis.VICA;
  const plata = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const plan = (id) => D.planes.find((p) => p.id === id);
  const miPlan = plan(D.usuario.plan);
  const lista = (arr) => arr.join(", ");

  // ---- Secciones a las que Rufino puede llevar al usuario ----
  const secciones = [
    { id: "inicio", nombre: "Inicio", descripcion: "portada con el resumen del día: avance de la vivienda, próxima cuota, votación abierta y próxima reunión", palabras: ["inicio", "principio", "portada", "home", "resumen"] },
    { id: "nosotros", nombre: "Nosotros", descripcion: "quiénes somos, misión, visión, objeto social, valores y organigrama", palabras: ["nosotros", "quienes son", "quienes somos", "mision", "vision", "valores", "objeto social", "organigrama", "historia"] },
    { id: "proyecto", nombre: "Cómo funciona", descripcion: "los cuatro pasos del modelo (asociación, aportes, gestión y construcción), el proyecto Barrio Los Sauces y la construcción sustentable", palabras: ["como funciona", "proyecto", "pasos", "proceso", "sustentable", "funcionamiento"] },
    { id: "planes", nombre: "Planes y financiación", descripcion: "los modelos de vivienda Espinillo, Ceibo y Aromo con sus cuotas, y el simulador de cuotas", palabras: ["plan", "planes", "modelo", "modelos", "financiacion", "simulador", "simular", "espinillo", "ceibo", "aromo", "monoambiente", "dormitorio"] },
    { id: "cooperativismo", nombre: "Cooperativismo", descripcion: "los siete principios cooperativos y cómo se organiza una cooperativa", palabras: ["cooperativismo", "principios", "cooperativa que es", "asamblea", "consejo", "sindico", "sindicatura"] },
    { id: "transparencia", nombre: "Transparencia", descripcion: "estatuto, actas, balances, autoridades y marco normativo", palabras: ["transparencia", "estatuto", "acta", "actas", "balance", "autoridades", "presidente", "presidenta", "tesorera", "ley", "normativa", "reglamento"] },
    { id: "noticias", nombre: "Noticias", descripcion: "novedades de la cooperativa", palabras: ["noticias", "novedades", "que hay de nuevo"] },
    { id: "asociarme", nombre: "Quiero asociarme", descripcion: "requisitos y formulario de asociación en cuatro pasos", palabras: ["asociarme", "asociarse", "asociar", "inscribirme a la cooperativa", "sumarme", "hacerme socio", "requisitos", "formulario"] },
    { id: "contacto", nombre: "Contacto", descripcion: "dirección, correo, teléfono, WhatsApp, horario y formulario de consulta", palabras: ["contacto", "contactar", "telefono", "whatsapp", "correo", "mail", "direccion", "donde queda", "horario", "sede", "oficina"] },
    { id: "cuenta", nombre: "Mi cuenta", descripcion: "datos de la asociada, avance de su vivienda por etapas, resumen de cuotas, documentación y comunicaciones", palabras: ["mi cuenta", "mis datos", "mi perfil", "documentacion", "contrato", "plano", "mi vivienda", "mi casa"] },
    { id: "obra", nombre: "Avance de obra", descripcion: "seguimiento de Barrio Los Sauces: etapa, porcentaje, estado de cada lote y bitácora de obra", palabras: ["obra", "avance", "construccion", "lote", "lotes", "bitacora", "barrio los sauces", "sauces", "como va"] },
    { id: "pagos", nombre: "Pagos y cuotas", descripcion: "estado de cuenta, pagar la cuota y ver comprobantes", palabras: ["pago", "pagos", "pagar", "cuota", "cuotas", "comprobante", "vencimiento", "debo", "deuda", "estado de cuenta"] },
    { id: "votaciones", nombre: "Votaciones", descripcion: "votación abierta del proyecto Barrio Norte y resultados anteriores", palabras: ["votar", "votacion", "votaciones", "voto", "barrio norte", "resultado", "elecciones"] },
    { id: "reuniones", nombre: "Reuniones", descripcion: "agenda de reuniones con confirmación de asistencia y opción para agendar en el calendario", palabras: ["reunion", "reuniones", "asamblea general", "comision de obra", "agenda", "calendario"] },
    { id: "comunidad", nombre: "Comunidad", descripcion: "canales de chat: avisos oficiales, grupo Barrio Los Sauces y comisión de obra", palabras: ["comunidad", "chat", "grupo", "grupos", "vecinos", "avisos", "mensaje"] },
    { id: "tramites", nombre: "Trámites", descripcion: "seguimiento de trámites y formulario para iniciar uno nuevo (certificado, libre deuda, cambio de plan, reclamos)", palabras: ["tramite", "tramites", "certificado", "libre deuda", "reclamo", "sugerencia", "cambio de plan", "gestion"] },
    { id: "capacitacion", nombre: "Capacitación", descripcion: "talleres y cursos con inscripción", palabras: ["capacitacion", "curso", "cursos", "taller", "talleres", "aprender", "inscribirme"] },
    { id: "ayuda", nombre: "Ayuda para usar la app", descripcion: "videotutoriales, taller presencial, línea de ayuda, guía impresa y atajos", palabras: ["ayuda", "no se usar", "tutorial", "como se usa", "guia", "no entiendo", "adultos mayores"] },
    { id: "admin", nombre: "Panel administrativo", descripcion: "vista de gestión demo con indicadores y listado de asociados con buscador", palabras: ["admin", "administrativo", "panel", "gestion interna", "indicadores", "listado de asociados"] },
  ];

  // ---- Elementos concretos que Rufino puede señalar ----
  const elementos = [
    { id: "btn-pagar", vista: "pagos", descripcion: "botón para pagar la cuota pendiente" },
    { id: "simulador", vista: "planes", descripcion: "simulador de cuotas" },
    { id: "plan-espinillo", vista: "planes", descripcion: "tarjeta del modelo Espinillo" },
    { id: "plan-ceibo", vista: "planes", descripcion: "tarjeta del modelo Ceibo" },
    { id: "plan-aromo", vista: "planes", descripcion: "tarjeta del modelo Aromo" },
    { id: "votacion-activa", vista: "votaciones", descripcion: "votación abierta de Barrio Norte" },
    { id: "form-asociarse", vista: "asociarme", descripcion: "formulario de asociación" },
    { id: "avance-vivienda", vista: "cuenta", descripcion: "avance por etapas de la vivienda de la asociada" },
    { id: "documentos", vista: "cuenta", descripcion: "documentación descargable de la asociada" },
    { id: "mapa-lotes", vista: "obra", descripcion: "mapa con el estado de cada lote" },
    { id: "organigrama", vista: "nosotros", descripcion: "organigrama de la cooperativa" },
    { id: "autoridades", vista: "transparencia", descripcion: "tabla de autoridades" },
    { id: "lista-reuniones", vista: "reuniones", descripcion: "lista de reuniones con botones de asistencia" },
    { id: "nuevo-tramite", vista: "tramites", descripcion: "formulario para iniciar un trámite" },
    { id: "form-contacto", vista: "contacto", descripcion: "formulario de consulta" },
    { id: "btn-letra", vista: "", descripcion: "botón AA para agrandar la letra (arriba a la derecha, en todas las pantallas)" },
  ];

  // ---- Guías paso a paso (las usa Gemini para explicar) ----
  const guias = `
- Pagar la cuota: ir a "Pagos y cuotas", tocar "Pagar cuota", elegir el medio de pago y "Confirmar pago". Se genera un comprobante que se puede imprimir. Desde la tabla se ven los comprobantes anteriores.
- Ver el avance de la vivienda: "Mi cuenta" muestra las etapas de la vivienda; "Avance de obra" muestra el barrio completo, cada lote y la bitácora.
- Votar: ir a "Votaciones", elegir una opción, tocar "Emitir mi voto" y confirmar. El voto no se puede cambiar y se entrega una constancia.
- Reuniones: en "Reuniones" se confirma asistencia y el botón "Agendar" descarga el evento para el calendario del celular.
- Asociarse: "Quiero asociarme", completar los 4 pasos (datos personales, documentación, plan y confirmación). Queda en estado "En revisión" y la cooperativa contacta en los próximos días.
- Trámites: en "Trámites" se elige el tipo, se agrega un detalle y se toca "Iniciar trámite". Estados: Recibido, En revisión, En proceso, Finalizado.
- Capacitación: en "Capacitación" se toca "Inscribirme" en el taller o curso.
- Comunidad: elegir un canal y escribir. En "Avisos oficiales" solo publica la cooperativa.
- Letra grande: botón AA arriba a la derecha.
- Simular cuotas: en "Planes y financiación", elegir el modelo o escribir un monto y el plazo.
- Hablar con una persona: teléfono ${D.cooperativa.telefono}, WhatsApp ${D.cooperativa.whatsapp}, ${D.cooperativa.horario}, o el chat de Comunidad.`.trim();

  // ---- Todos los datos en texto (para Gemini) ----
  const u = D.usuario;
  const datos = `
COOPERATIVA: ${D.cooperativa.nombre}. Lema: "${D.cooperativa.lema}" Frase: "${D.cooperativa.frase}"
Ubicación: ${D.cooperativa.ciudad}. ${D.cooperativa.sobreCiudad} Constituida el ${D.cooperativa.constitucion} en Sunchales.
Origen: proyecto académico de estudiantes de la Tecnicatura Superior en Gestión de las Organizaciones, enmarcado en la Economía Social y Solidaria.
Dirección: ${D.cooperativa.direccion}. Correo: ${D.cooperativa.email}. Teléfono: ${D.cooperativa.telefono}. WhatsApp: ${D.cooperativa.whatsapp}. Atención: ${D.cooperativa.horario}.
Objeto social: ${D.cooperativa.objetoSocial}
Misión: ${D.cooperativa.mision}
Visión: ${D.cooperativa.vision}
Valores: ${D.cooperativa.valores.map((v) => `${v.nombre} (${v.texto})`).join("; ")}
Qué hace: ${D.cooperativa.queHace}
Proceso: ${D.proceso.map((p) => `${p.n}. ${p.titulo}: ${p.texto}`).join(" ")}
Sustentabilidad: construcción responsable, eficiencia energética (orientación solar, aislación, preinstalación de termotanque solar), cuidado ambiental, trabajo con cooperativas de trabajo locales.
Organigrama — planta permanente: ${lista(D.organigrama.plantaPermanente)}. Línea staff: ${lista(D.organigrama.staff)}. Hay manual de funciones con finalidad y requisitos de cada puesto.
Autoridades (ficticias): ${D.autoridades.map((a) => `${a.cargo}: ${a.nombre}`).join("; ")}.
Marco normativo: ${lista(D.normativa)}.
Documentos de constitución: acta constitutiva y estatuto, Acta N° 1 del Consejo de Administración, declaración jurada de ayuda mutua de vivienda, declaración jurada de inexistencia de parentesco, nota de presentación de vivienda, declaración jurada de persona políticamente expuesta.
Documentos públicos en la app: ${D.documentosPublicos.map((d) => `${d.nombre} (${d.detalle})`).join("; ")}.
Principios cooperativos: ${D.principios.map((p, i) => `${i + 1}) ${p}`).join(" ")}.

PLANES (sistema ${D.financiacion.sistema}, tasa ${D.financiacion.tna}): ${D.planes.map((p) => `Modelo ${p.nombre} (${p.tipo}, ${p.m2} m², ${p.banos} baño${p.banos > 1 ? "s" : ""}): valor ${plata(p.valor)}, ${p.cuotas} cuotas de ${plata(p.cuota)}. ${p.descripcion}`).join(" | ")}
Plazos posibles en el simulador: ${D.financiacion.plazos.join(", ")} cuotas. ${D.financiacion.aclaracion}
Requisitos para asociarse: ${lista(D.requisitosAsociarse)}.

USUARIA ACTUAL (demo): ${u.nombre}, asociada N° ${u.numero}, desde ${u.ingreso}. Plan Ceibo (2 dormitorios), lote ${u.lote} de ${D.obra.nombre}. Etapa de su vivienda: ${D.etapasVivienda[u.etapa]} (${u.avance}% de avance). Etapas: ${D.etapasVivienda.join(" → ")}.
Cuota mensual: ${plata(miPlan.cuota)}. Cuotas: ${D.cuotas.map((c) => `${c.mes} vence ${c.vence} (${c.estado})`).join("; ")}. Total ${u.cuotasTotales} cuotas.
Medios de pago: ${lista(D.mediosPago)}.
Documentación personal: ${D.documentos.map((d) => d.nombre).join(", ")}.
Comunicaciones: ${D.comunicaciones.map((c) => `${c.fecha}: ${c.texto}`).join(" ")}

OBRA ${D.obra.nombre}: ${D.obra.viviendas} viviendas, etapa ${D.etapasObra[D.obra.etapa]}, avance general ${D.obra.avance}%. Ejecuta: ${D.obra.ejecuta}. Entrega estimada: ${D.obra.entregaEstimada}. Etapas: ${D.etapasObra.join(" → ")}.
Bitácora: ${D.obra.bitacora.map((b) => `${b.fecha}: ${b.texto}`).join(" ")}
Lotes: ${D.obra.lotes.filter((l) => l === 2).length} con techos en curso, ${D.obra.lotes.filter((l) => l === 1).length} con mampostería terminada. El lote 12 (Marina) tiene mampostería terminada.

VOTACIONES: Abierta: "${D.votaciones[0].titulo}" hasta el ${D.votaciones[0].cierre}, opciones ${lista(D.votaciones[0].opciones)}, participación ${D.votaciones[0].participacion}%. ${D.votaciones[0].detalle} Finalizada: "${D.votaciones[1].titulo}": ${D.votaciones[1].resultado.map((r) => `${r.opcion} ${r.porcentaje}%`).join(", ")} (participación ${D.votaciones[1].participacion}%). ${D.aclaracionVoto}
REUNIONES: ${D.reuniones.map((r) => `${r.titulo}: ${r.fecha} a las ${r.hora} hs en ${r.lugar}. ${r.nota}`).join(" | ")}
COMUNIDAD: canales ${D.comunidad.map((c) => `${c.nombre} (${c.miembros} miembros${c.oficial ? ", solo publica la cooperativa" : ""})`).join(", ")}.
NOTICIAS: ${D.noticias.map((n) => `${n.fecha} ${n.titulo}: ${n.texto}`).join(" | ")}
TRÁMITES de Marina: ${D.tramites.map((t) => `${t.nombre} (${D.estadosTramite[t.estado]})`).join(", ")}. Tipos disponibles: ${lista(D.tiposTramite)}.
CAPACITACIONES: ${D.capacitaciones.map((c) => `${c.titulo} (${c.modalidad}, ${c.fecha})`).join("; ")}.
AYUDA: ${D.ayuda.map((a) => `${a.titulo}: ${a.texto}`).join(" ")}
PANEL ADMINISTRATIVO (demo): ${D.admin.asociados} asociados, ${D.admin.enConstruccion} viviendas en construcción, ${D.admin.participacion}% de participación en la última votación, morosidad ${D.admin.morosidad}%.
Fecha de hoy: martes 6 de octubre de 2026.`.trim();

  // ---- Preguntas frecuentes (modo guionado y botones) ----
  // respuesta puede ser texto o función(contexto) → texto
  const faq = [
    { pregunta: "¿Cuándo vence mi cuota?", palabras: ["vence", "vencimiento", "cuando pago", "proxima cuota", "cuanto debo", "cuota de octubre"], respuesta: (c) => (c.proximaCuota === "al día" ? "Estás al día con tus cuotas. ¡Muy bien!" : `Tu próxima cuota es la de ${c.proximaCuota}. Te muestro dónde pagarla.`), destino: "pagos", elemento: "btn-pagar" },
    { pregunta: "¿Cómo pago la cuota?", palabras: ["como pago", "pagar", "pago la cuota", "abonar", "medios de pago", "tarjeta", "transferencia", "mercado pago"], respuesta: `Es muy simple: en Pagos y cuotas tocás “Pagar cuota”, elegís el medio de pago y confirmás. Aceptamos ${lista(D.mediosPago).toLowerCase()}. Se genera un comprobante al instante.`, destino: "pagos", elemento: "btn-pagar" },
    { pregunta: "¿Cómo va mi casa?", palabras: ["mi casa", "mi vivienda", "como va", "avance", "cuando me entregan", "entrega", "etapa"], respuesta: `Tu vivienda modelo Ceibo, en el lote ${u.lote} de ${D.obra.nombre}, está en etapa de ${D.etapasVivienda[u.etapa].toLowerCase()} con un ${u.avance} por ciento de avance. La entrega se estima para el ${D.obra.entregaEstimada}.`, destino: "cuenta", elemento: "avance-vivienda" },
    { pregunta: "¿Cómo voto?", palabras: ["votar", "como voto", "votacion", "barrio norte", "voto"], respuesta: (c) => (c.votoBarrioNorte !== "todavía no votó" ? `Ya votaste en la votación de Barrio Norte: elegiste “${c.votoBarrioNorte}”. El resultado se publica al cierre, el ${D.votaciones[0].cierre}.` : `Está abierta la votación por el proyecto Barrio Norte hasta el ${D.votaciones[0].cierre}. Elegís una opción, tocás “Emitir mi voto” y confirmás. Te llevo.`), destino: "votaciones", elemento: "votacion-activa" },
    { pregunta: "¿Qué planes hay?", palabras: ["planes", "modelos", "que casas", "tipos de casa", "cuanto sale", "precio", "cuanto cuesta", "valor"], respuesta: `Hay tres modelos: Espinillo, monoambiente de 30 metros, ${D.planes[0].cuotas} cuotas de ${plata(D.planes[0].cuota)}; Ceibo, de dos dormitorios, cuotas de ${plata(D.planes[1].cuota)}; y Aromo, de tres dormitorios, cuotas de ${plata(D.planes[2].cuota)}. Todo en sistema francés.`, destino: "planes" },
    { pregunta: "Simular una cuota", palabras: ["simular", "simulador", "calcular", "cuanto pagaria", "financiacion", "sistema frances", "tasa", "interes"], respuesta: `En el simulador elegís el modelo o escribís un monto, y el plazo entre ${D.financiacion.plazos.join(", ")} cuotas. Usamos sistema francés, de cuota fija, con una tasa ilustrativa del 6 por ciento anual.`, destino: "planes", elemento: "simulador" },
    { pregunta: "¿Cuándo es la próxima reunión?", palabras: ["reunion", "asamblea", "comision", "cuando se juntan", "encuentro"], respuesta: `La próxima es la ${D.reuniones[0].titulo.toLowerCase()}, el ${D.reuniones[0].fecha} a las ${D.reuniones[0].hora}. Y la ${D.reuniones[1].titulo.toLowerCase()} es el ${D.reuniones[1].fecha} a las ${D.reuniones[1].hora}, en el ${D.reuniones[1].lugar}.`, destino: "reuniones", elemento: "lista-reuniones" },
    { pregunta: "¿Cómo me asocio?", palabras: ["asociarme", "asociarse", "asociar", "hacerme socio", "sumarme", "unirme", "requisitos", "que necesito"], respuesta: `Para asociarte necesitás: ${lista(D.requisitosAsociarse).toLowerCase()}. Completás el formulario en cuatro pasos y la cooperativa te contacta.`, destino: "asociarme", elemento: "form-asociarse" },
    { pregunta: "¿Cómo los contacto?", palabras: ["contacto", "contactar", "telefono", "whatsapp", "correo", "mail", "hablar con una persona", "humano", "donde queda", "direccion", "horario"], respuesta: `Nos encontrás en ${D.cooperativa.direccion}, de ${D.cooperativa.horario}. Teléfono ${D.cooperativa.telefono}, WhatsApp ${D.cooperativa.whatsapp}, o por correo a ${D.cooperativa.email}.`, destino: "contacto" },
    { pregunta: "¿Qué es ViCa?", palabras: ["que es vica", "que es esto", "quienes son", "que hacen", "de que se trata", "mision", "vision"], respuesta: `ViCa es una cooperativa de vivienda de Sunchales, constituida el ${D.cooperativa.constitucion}. Organizamos a los asociados para acceder a viviendas dignas, accesibles y sustentables. Como decimos: no solo construimos casas, construimos comunidad.`, destino: "nosotros" },
    { pregunta: "¿Qué es una cooperativa?", palabras: ["que es una cooperativa", "cooperativismo", "principios", "un voto"], respuesta: "Una cooperativa es una organización de personas que se unen voluntariamente para resolver una necesidad común, con gestión democrática: cada asociado tiene un voto. Se guían por siete principios cooperativos.", destino: "cooperativismo" },
    { pregunta: "¿Quiénes son las autoridades?", palabras: ["autoridades", "presidenta", "presidente", "consejo", "tesorera", "secretario", "sindico", "quien dirige"], respuesta: `El Consejo de Administración lo preside ${D.autoridades[0].nombre}; ${D.autoridades[1].nombre} es secretario y ${D.autoridades[2].nombre} tesorera. El síndico titular es ${D.autoridades[5].nombre}.`, destino: "transparencia", elemento: "autoridades" },
    { pregunta: "¿Cómo inicio un trámite?", palabras: ["tramite", "certificado", "libre deuda", "reclamo", "cambio de plan"], respuesta: `En Trámites elegís el tipo, por ejemplo certificado, libre deuda o cambio de plan, y tocás “Iniciar trámite”. Vas a ver cómo avanza: recibido, en revisión, en proceso y finalizado.`, destino: "tramites", elemento: "nuevo-tramite" },
    { pregunta: "¿Qué cursos hay?", palabras: ["curso", "taller", "capacitacion", "aprender"], respuesta: `Hay ${D.capacitaciones.length} propuestas: ${D.capacitaciones.map((c) => c.titulo.toLowerCase()).join(", ")}. Te podés inscribir desde Capacitación.`, destino: "capacitacion" },
    { pregunta: "No sé usar la app", palabras: ["no se usar", "no entiendo", "ayuda", "me cuesta", "tutorial", "soy grande", "la tecnologia"], respuesta: "No se preocupe, para eso estoy. Puede preguntarme lo que necesite, escribiendo o con el micrófono, y yo lo llevo. También hay videotutoriales, un taller mensual en la sede y una línea telefónica de ayuda.", destino: "ayuda" },
    { pregunta: "Agrandar la letra", palabras: ["letra", "no veo", "mas grande", "agrandar", "lupa", "leer mejor"], respuesta: "Arriba a la derecha está el botón con dos letras A. Tocándolo, toda la letra se agranda. Se lo señalo.", destino: "", elemento: "btn-letra" },
    { pregunta: "¿Cómo va la obra?", palabras: ["obra", "barrio los sauces", "sauces", "construccion", "techos", "mamposteria", "bitacora"], respuesta: `${D.obra.nombre} tiene ${D.obra.viviendas} viviendas y va por un ${D.obra.avance} por ciento. El ${D.obra.bitacora[0].fecha.slice(0, 5)} se terminó la mampostería y ahora siguen los techos.`, destino: "obra", elemento: "mapa-lotes" },
    { pregunta: "¿Qué ley rige a la cooperativa?", palabras: ["ley", "normativa", "20337", "20.337", "inaes", "legal", "estatuto"], respuesta: "La cooperativa se rige por la Ley 20.337 de Cooperativas, las resoluciones del INAES y su estatuto social. En obra también aplican la Ley 19.587 de Higiene y Seguridad y la Ley 24.557 de Riesgos del Trabajo.", destino: "transparencia" },
    { pregunta: "¿Quién construye las casas?", palabras: ["quien construye", "constructora", "cooperativa de trabajo", "quien hace la obra"], respuesta: `La obra la ejecuta una cooperativa de trabajo especializada, ${D.obra.ejecuta.replace(" (ficticia)", "")}. Así aplicamos el sexto principio: cooperación entre cooperativas.`, destino: "proyecto" },
    { pregunta: "Ver el organigrama", palabras: ["organigrama", "estructura", "departamentos", "areas"], respuesta: "La cooperativa tiene una planta permanente con la asamblea de asociados, el consejo de administración, el síndico, la coordinación general y tres departamentos: asociados, producción de obras y finanzas. Y una línea staff de asesoramiento. Se lo muestro.", destino: "nosotros", elemento: "organigrama" },
    { pregunta: "¿Dónde están mis documentos?", palabras: ["documentos", "contrato", "plano", "reglamento", "descargar"], respuesta: "Tu contrato, el plano de tu Ceibo, el reglamento y el libre deuda están en Mi cuenta, en Documentación.", destino: "cuenta", elemento: "documentos" },
  ];

  // Sugerencias según la pantalla donde está el usuario
  const sugerenciasPorVista = {
    inicio: ["¿Cuándo vence mi cuota?", "¿Cómo va mi casa?", "¿Cómo voto?"],
    pagos: ["¿Cómo pago la cuota?", "¿Cuándo vence mi cuota?", "Simular una cuota"],
    planes: ["Simular una cuota", "¿Qué planes hay?", "¿Cómo me asocio?"],
    obra: ["¿Cómo va mi casa?", "¿Quién construye las casas?", "¿Cómo va la obra?"],
    votaciones: ["¿Cómo voto?", "¿Qué es una cooperativa?", "¿Cuándo es la próxima reunión?"],
    asociarme: ["¿Cómo me asocio?", "¿Qué planes hay?", "¿Cómo los contacto?"],
    ayuda: ["No sé usar la app", "Agrandar la letra", "¿Cómo los contacto?"],
    transparencia: ["¿Quiénes son las autoridades?", "¿Qué ley rige a la cooperativa?", "¿Qué es ViCa?"],
    _: ["¿Cuándo vence mi cuota?", "¿Qué planes hay?", "No sé usar la app"],
  };

  // Lo que comenta Rufino la primera vez que se entra a cada pantalla
  const consejos = {
    pagos: "Acá está tu estado de cuenta. Si querés pagar la cuota de octubre, el botón verde hace todo en dos pasos.",
    planes: "Estos son los tres modelos. Más abajo hay un simulador para calcular la cuota con el monto y el plazo que quieras.",
    obra: "Este es el barrio. Tu lote es el doce, el que tiene borde dorado.",
    votaciones: "En una cooperativa cada asociado tiene un voto. Tu opinión sobre Barrio Norte cuenta.",
    asociarme: "Son cuatro pasos cortos. Si te trabás en alguno, preguntame.",
    comunidad: "Los avisos oficiales aparecen en verde para distinguirlos de las charlas entre vecinos.",
    transparencia: "Toda la documentación institucional está a disposición de los asociados.",
    cuenta: "Este es tu espacio personal: el avance de tu casa, tus cuotas y tus documentos.",
    reuniones: "Con el botón Agendar, la reunión queda guardada en el calendario de tu celular.",
    ayuda: "Si algo cuesta, no hay apuro. Yo te acompaño, y también podés llamar a la cooperativa.",
  };

  globalThis.CONOCIMIENTO = {
    app: { nombre: "ViCa", descripcion: "plataforma web de ViCa Cooperativa de Vivienda Limitada (Sunchales) para asociados e interesados" },
    mascota: {
      nombre: "Rufino",
      especie: "hornero",
      personalidad:
        "un hornero (el ave que construye su casa de barro, símbolo del trabajo y del hogar). Cordial, sereno, servicial y formal sin ser frío. Habla en español rioplatense con voseo respetuoso; si el usuario lo trata de usted o parece una persona mayor, le responde de usted. Puede hacer, muy de vez en cuando, una referencia simpática a que los horneros saben de construir casas, pero sin abusar",
      saludo: `Hola, ${u.nombreCorto}. Soy Rufino, el hornero de ViCa. Como buen hornero, de casas sé bastante. Te cuento que tu cuota de octubre vence el diez y que está abierta la votación por Barrio Norte. Preguntame lo que necesites: podés escribirme o hablarme.`,
      saludoCorto: `¡Hola, ${u.nombreCorto}! ¿En qué te puedo ayudar?`,
    },
    secciones,
    elementos,
    guias,
    datos,
    faq,
    sugerenciasPorVista,
    consejos,
    respuestaPorDefecto:
      "Disculpá, eso no lo tengo claro. Podés preguntarme por tus cuotas, el avance de tu casa, las votaciones, los planes o cómo asociarse. Y si preferís hablar con una persona, el teléfono es " + D.cooperativa.telefono + ".",
  };
})();
