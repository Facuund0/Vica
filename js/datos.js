// =============================================================
//  DATOS DE LA APP ViCa  (fuente única)
//  Los usa la interfaz, la mascota en modo guionado y Gemini.
//  Si cambiás algo acá, se actualiza en todos lados.
//  Valores ilustrativos: proyecto académico.
// =============================================================
(function () {
  // ---- Financiación (sistema francés) ----
  const TNA = 0.06; // tasa nominal anual ilustrativa
  function cuotaFrancesa(monto, cuotas, tna = TNA) {
    const i = tna / 12;
    if (i === 0) return monto / cuotas;
    return (monto * i) / (1 - Math.pow(1 + i, -cuotas));
  }

  const planes = [
    {
      id: "espinillo",
      nombre: "Espinillo",
      tipo: "Monoambiente",
      m2: 30,
      banos: 1,
      dormitorios: 0,
      valor: 18000000,
      cuotas: 120,
      descripcion: "Ideal para una persona o pareja. Cocina integrada, baño completo y patio.",
    },
    {
      id: "ceibo",
      nombre: "Ceibo",
      tipo: "2 dormitorios",
      m2: 62,
      banos: 1,
      dormitorios: 2,
      valor: 30000000,
      cuotas: 120,
      descripcion: "El modelo más elegido. Living comedor, cocina, dos dormitorios y patio con galería.",
    },
    {
      id: "aromo",
      nombre: "Aromo",
      tipo: "3 dormitorios",
      m2: 85,
      banos: 2,
      dormitorios: 3,
      valor: 42000000,
      cuotas: 120,
      descripcion: "Para familias. Tres dormitorios, dos baños, lavadero y espacio para cochera.",
    },
  ].map((p) => ({ ...p, cuota: Math.round(cuotaFrancesa(p.valor, p.cuotas)) }));

  const ceibo = planes.find((p) => p.id === "ceibo");

  const etapasVivienda = ["Inscripción", "Elección de plan", "Documentación", "Inicio del proyecto", "Compra de materiales", "Construcción", "Inspección", "Finalización", "Entrega"];
  const etapasObra = ["Aprobado", "Planificación", "Compra de materiales", "Inicio de obra", "Construcción", "Inspección", "Finalización", "Entrega"];

  globalThis.VICA = {
    hoy: "2026-10-06",
    TNA,
    cuotaFrancesa,

    cooperativa: {
      nombre: "ViCa Cooperativa de Vivienda Limitada",
      corto: "ViCa",
      lema: "Construir juntos, vivir mejor.",
      frase: "ViCa no solo construye casas, construye comunidad.",
      ciudad: "Sunchales, Santa Fe, Argentina",
      sobreCiudad: "Sunchales es conocida como la capital nacional del cooperativismo.",
      constitucion: "27 de abril de 2026",
      direccion: "Avenida Yrigoyen 850, Sunchales, Santa Fe",
      email: "contacto@vica.coop.ar",
      telefono: "03493 000000",
      whatsapp: "3493 000000",
      horario: "lunes a viernes de 8 a 16 hs",
      objetoSocial:
        "Promover, diseñar, construir y gestionar viviendas para sus socios; coordinar servicios relacionados a la vivienda y comunitarios que fortalezcan la cohesión social y la sostenibilidad ambiental para garantizar el acceso a una vivienda digna, sustentable y equitativa; y fomentar la participación democrática, la solidaridad y la equidad entre los asociados.",
      mision:
        "Proporcionar a los socios el acceso a viviendas dignas, seguras y sostenibles, mediante la gestión participativa de sus inmuebles y servicios, promoviendo la educación, la transparencia y la responsabilidad con el entorno.",
      vision:
        "Convertirse en la cooperativa de referencia en la comunidad para viviendas justas y de alta calidad, impulsando prácticas innovadoras de construcción sostenible, eficiencia energética y alianzas con actores locales, para generar un impacto social y ambiental positivo y duradero.",
      valores: [
        { icono: "🤝", nombre: "Solidaridad", texto: "Promovemos la ayuda mutua y la colaboración entre asociados." },
        { icono: "🏠", nombre: "Acceso a la vivienda", texto: "Generamos alternativas que faciliten el acceso a una solución habitacional digna." },
        { icono: "👥", nombre: "Participación", texto: "Cada asociado forma parte de una organización democrática: un asociado, un voto." },
        { icono: "🌱", nombre: "Sustentabilidad", texto: "Construcción responsable, eficiencia energética y cuidado ambiental." },
      ],
      queHace:
        "ViCa organiza a sus asociados, administra los aportes, coordina proveedores y gestiona las etapas del proyecto habitacional. La construcción se terceriza con una cooperativa de trabajo especializada (sexto principio: cooperación entre cooperativas).",
    },

    proceso: [
      { n: 1, titulo: "Asociación", texto: "Las personas interesadas se incorporan a la cooperativa completando la solicitud y la documentación." },
      { n: 2, titulo: "Aportes", texto: "Los asociados pagan sus cuotas mensuales, que sostienen el proyecto habitacional." },
      { n: 3, titulo: "Gestión", texto: "ViCa administra los recursos, coordina proveedores y organiza las etapas de obra." },
      { n: 4, titulo: "Construcción", texto: "La obra la ejecuta una cooperativa de trabajo especializada, con control de higiene y seguridad." },
    ],

    planes,
    financiacion: {
      sistema: "Francés (cuota fija)",
      tna: "6 % nominal anual (ilustrativa)",
      ejemplo: { valor: 30000000, cuotas: 120, cuota: ceibo.cuota },
      plazos: [60, 120, 180, 240],
      aclaracion: "Los importes son demostrativos. Las condiciones reales surgen del proyecto, el reglamento y la documentación de la cooperativa.",
    },

    // ---- Asociada de la demo ----
    usuario: {
      nombre: "Marina Pereyra",
      nombreCorto: "Marina",
      numero: "0042",
      ingreso: "mayo de 2026",
      plan: "ceibo",
      lote: 12,
      etapa: 5, // índice en etapasVivienda → Construcción
      avance: 42,
      cuotasPagadas: 4,
      cuotasTotales: 120,
      proximoVencimiento: "10/10/2026",
    },
    etapasVivienda,

    cuotas: [
      { mes: "Junio 2026", vence: "10/06/2026", estado: "Pagada", comprobante: "C-0042-0001" },
      { mes: "Julio 2026", vence: "10/07/2026", estado: "Pagada", comprobante: "C-0042-0002" },
      { mes: "Agosto 2026", vence: "10/08/2026", estado: "Pagada", comprobante: "C-0042-0003" },
      { mes: "Septiembre 2026", vence: "10/09/2026", estado: "Pagada", comprobante: "C-0042-0004" },
      { mes: "Octubre 2026", vence: "10/10/2026", estado: "Pendiente" },
      { mes: "Noviembre 2026", vence: "10/11/2026", estado: "Próxima" },
    ],
    mediosPago: ["Transferencia bancaria", "Tarjeta de débito", "Mercado Pago", "Pago en la sede (efectivo)"],

    documentos: [
      { nombre: "Contrato de adjudicación", tipo: "PDF" },
      { nombre: "Plano de la vivienda Ceibo", tipo: "PDF" },
      { nombre: "Reglamento interno", tipo: "PDF" },
      { nombre: "Libre deuda al 30/09", tipo: "PDF" },
    ],

    comunicaciones: [
      { fecha: "02/10", texto: "Se completó la etapa de mampostería en Barrio Los Sauces." },
      { fecha: "28/09", texto: "Abrió la votación por el proyecto Barrio Norte." },
    ],

    // ---- Obra ----
    obra: {
      nombre: "Barrio Los Sauces",
      viviendas: 24,
      etapa: 4, // índice en etapasObra → Construcción
      avance: 38,
      ejecuta: "Cooperativa de trabajo Construyendo Unidos Ltda. (ficticia)",
      entregaEstimada: "segundo semestre de 2027",
      bitacora: [
        { fecha: "02/10/2026", texto: "Mampostería terminada en las 24 viviendas." },
        { fecha: "15/09/2026", texto: "Llegó el segundo lote de materiales (aberturas y techos)." },
        { fecha: "20/08/2026", texto: "Inspección de higiene y seguridad aprobada sin observaciones." },
        { fecha: "01/07/2026", texto: "Inicio de obra: replanteo y fundaciones." },
      ],
      // estado de cada lote (1-24): 0 fundaciones, 1 mampostería, 2 techos
      lotes: [2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1],
    },
    etapasObra,

    // ---- Participación ----
    votaciones: [
      {
        id: "barrio-norte",
        titulo: "Aprobación del proyecto Barrio Norte (16 viviendas)",
        estado: "abierta",
        cierre: "20/10/2026",
        participacion: 41,
        opciones: ["Apruebo", "No apruebo", "Me abstengo"],
        detalle: "Segundo proyecto de la cooperativa: 16 viviendas en terrenos cedidos por convenio municipal. Documentación técnica y presupuesto adjuntos.",
      },
      {
        id: "horario-asamblea",
        titulo: "Horario de la asamblea general",
        estado: "finalizada",
        resultado: [
          { opcion: "Sábado 10 hs", porcentaje: 71 },
          { opcion: "Viernes 19 hs", porcentaje: 29 },
        ],
        participacion: 68,
      },
    ],
    aclaracionVoto:
      "Una votación real requiere autenticación reforzada, verificación de identidad e integridad del voto conforme a la Ley 20.337. Aquí se muestra el flujo de manera demostrativa.",

    reuniones: [
      { id: "comision", titulo: "Comisión de obra", fecha: "Jueves 15/10/2026", hora: "18:30", lugar: "Sede ViCa", iso: "20261015T183000", nota: "Acta de la reunión anterior disponible." },
      { id: "asamblea", titulo: "Asamblea general ordinaria", fecha: "Sábado 24/10/2026", hora: "10:00", lugar: "Salón cooperativo, Sunchales", iso: "20261024T100000", nota: "Orden del día: memoria y balance, avance de obra, proyecto Barrio Norte." },
    ],

    comunidad: [
      {
        id: "avisos",
        nombre: "Avisos oficiales",
        oficial: true,
        miembros: 128,
        mensajes: [
          { autor: "ViCa", texto: "Recordamos que la cuota de octubre vence el 10/10.", hora: "lun 09:00" },
          { autor: "ViCa", texto: "Ya está abierta la votación por Barrio Norte hasta el 20/10.", hora: "28/09" },
        ],
      },
      {
        id: "sauces",
        nombre: "Grupo · Barrio Los Sauces",
        miembros: 24,
        mensajes: [
          { autor: "Oscar D.", texto: "¿Alguien sabe cuándo empiezan con los techos?", hora: "10:12" },
          { autor: "Lucía F.", texto: "En la comisión dijeron que la semana que viene.", hora: "10:20" },
        ],
      },
      {
        id: "comision-obra",
        nombre: "Grupo · Comisión de obra",
        miembros: 6,
        mensajes: [{ autor: "Juan Carlos B.", texto: "Subí el acta de la última reunión.", hora: "ayer" }],
      },
    ],

    noticias: [
      { fecha: "02/10/2026", titulo: "Avanza la obra de Barrio Los Sauces", texto: "Se completó la mampostería en las 24 viviendas. La próxima etapa es la colocación de techos." },
      { fecha: "28/09/2026", titulo: "Votación abierta: proyecto Barrio Norte", texto: "Los asociados pueden votar hasta el 20/10 desde la app o en la sede." },
      { fecha: "18/09/2026", titulo: "Nueva capacitación en finanzas personales", texto: "Inscripción abierta para asociados. Cupos limitados." },
      { fecha: "27/04/2026", titulo: "Se constituyó ViCa", texto: "En asamblea constitutiva se aprobó el estatuto y se eligió el primer Consejo de Administración." },
    ],

    // ---- Transparencia ----
    documentosPublicos: [
      { nombre: "Acta constitutiva y estatuto", detalle: "27/04/2026" },
      { nombre: "Acta N° 1 del Consejo de Administración", detalle: "Distribución de cargos" },
      { nombre: "Reglamento interno de vivienda", detalle: "Vigente" },
      { nombre: "Balance y memoria", detalle: "Primer ejercicio en curso" },
      { nombre: "Actas de comisión de obra", detalle: "Actualizadas al 01/10" },
      { nombre: "Declaraciones juradas (ayuda mutua, parentesco, PEP)", detalle: "Presentadas ante INAES" },
    ],
    autoridades: [
      { cargo: "Presidenta", nombre: "Laura Bianchi" },
      { cargo: "Secretario", nombre: "Martín Gaitán" },
      { cargo: "Tesorera", nombre: "Silvia Rosso" },
      { cargo: "Vocal titular", nombre: "Diego Ferrero" },
      { cargo: "Vocal titular", nombre: "Carolina Mana" },
      { cargo: "Síndico titular", nombre: "Ricardo Gamba" },
    ],
    organigrama: {
      plantaPermanente: ["Asamblea de asociados", "Consejo de administración", "Síndico", "Coordinación general", "Departamento de asociados", "Departamento de producción de obras", "Departamento de finanzas y administración"],
      staff: ["Auditor externo", "Recursos Humanos", "Marketing", "Cooperativa de trabajo", "Higiene y seguridad"],
    },
    normativa: [
      "Ley N.º 20.337 de Cooperativas",
      "Ley N.º 19.587 de Higiene y Seguridad en el Trabajo",
      "Decreto Reglamentario N.º 351/79",
      "Ley N.º 24.557 sobre Riesgos del Trabajo",
      "Resoluciones del INAES (Instituto Nacional de Asociativismo y Economía Social)",
      "Normativa municipal y provincial aplicable",
      "Estatuto social de la cooperativa",
    ],
    principios: [
      "Adhesión voluntaria y abierta",
      "Gestión democrática por parte de los asociados",
      "Participación económica de los asociados",
      "Autonomía e independencia",
      "Educación, formación e información",
      "Cooperación entre cooperativas",
      "Compromiso con la comunidad",
    ],

    // ---- Gestiones ----
    tramites: [
      { id: "T-118", nombre: "Actualizar datos personales", estado: 3 },
      { id: "T-131", nombre: "Solicitud de certificado de asociada", estado: 2 },
    ],
    estadosTramite: ["Recibido", "En revisión", "En proceso", "Finalizado"],
    tiposTramite: ["Certificado de asociado", "Libre deuda", "Cambio de plan", "Actualizar datos personales", "Reclamo o sugerencia"],

    capacitaciones: [
      { id: "hogar", titulo: "Mantenimiento del hogar", modalidad: "Taller presencial", fecha: "Sábado 17/10, 9:30 hs" },
      { id: "app", titulo: "Aprendé a usar la app ViCa", modalidad: "Taller presencial mensual", fecha: "Jueves 22/10, 17 hs" },
      { id: "finanzas", titulo: "Finanzas personales", modalidad: "Curso online", fecha: "4 encuentros desde el 3/11" },
      { id: "coop", titulo: "Educación cooperativa", modalidad: "Curso online", fecha: "A tu ritmo" },
    ],

    ayuda: [
      { icono: "🎥", titulo: "Videotutoriales cortos", texto: "“Cómo ver el avance de mi vivienda”, “Cómo pagar la cuota”, “Cómo votar”. Lenguaje simple y letra grande." },
      { icono: "👥", titulo: "Taller presencial mensual", texto: "En la sede, con ayuda de un asociado joven o del personal." },
      { icono: "📞", titulo: "Línea de ayuda", texto: "Teléfono y WhatsApp para consultas o para hacer un trámite acompañado." },
      { icono: "📘", titulo: "Guía impresa paso a paso", texto: "Cuadernillo con capturas grandes, para quienes prefieren papel." },
    ],

    requisitosAsociarse: [
      "Ser mayor de 18 años",
      "DNI vigente",
      "Comprobante de ingresos",
      "No ser titular de otra vivienda (declaración jurada)",
      "Abonar la cuota social de ingreso",
    ],

    // ---- Panel administrativo (demo) ----
    admin: {
      asociados: 128,
      enConstruccion: 24,
      participacion: 68,
      morosidad: 3,
      listado: [
        { nombre: "Marina Pereyra", numero: "0042", ingreso: "05/2026", plan: "Ceibo", estado: "Al día" },
        { nombre: "Juan Carlos Benítez", numero: "0008", ingreso: "04/2026", plan: "Aromo", estado: "Al día" },
        { nombre: "Lucía Fassi", numero: "0097", ingreso: "08/2026", plan: "Espinillo", estado: "Al día" },
        { nombre: "Oscar Díaz", numero: "0003", ingreso: "04/2026", plan: "Ceibo", estado: "Al día" },
        { nombre: "Gabriela Toledo", numero: "0051", ingreso: "05/2026", plan: "Ceibo", estado: "1 cuota adeudada" },
        { nombre: "Ramiro Acosta", numero: "0066", ingreso: "06/2026", plan: "Aromo", estado: "Al día" },
        { nombre: "Norma Giraudo", numero: "0012", ingreso: "04/2026", plan: "Espinillo", estado: "Al día" },
        { nombre: "Federico Paz", numero: "0110", ingreso: "09/2026", plan: "Ceibo", estado: "En revisión" },
      ],
    },
  };
})();
