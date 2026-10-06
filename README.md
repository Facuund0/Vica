# ViCa · Cooperativa de Vivienda — App con Rufino, el hornero

Plataforma demo de **ViCa Cooperativa de Vivienda Limitada** (Sunchales, Santa Fe), armada a partir de los prototipos "ViCa Web v2", "Raíces" y el informe institucional. Proyecto académico: todos los datos son ilustrativos.

## Qué tiene
**La cooperativa:** inicio, nosotros (misión, visión, objeto social, valores, organigrama), cómo funciona, planes con **simulador de cuotas** (sistema francés), cooperativismo, transparencia (documentos, autoridades, marco normativo), noticias, formulario de asociación en 4 pasos y contacto.

**Mi espacio (asociada demo: Marina Pereyra, N° 0042):** mi cuenta con avance por etapas, avance de obra con mapa de lotes y bitácora, **pagos con comprobante**, **votación** con confirmación y constancia, reuniones (confirmar asistencia y agendar en el calendario), comunidad (canales de chat), trámites, capacitación y ayuda.

**Gestión:** panel administrativo con indicadores y buscador de asociados.

Todo lo que hacés (pagar, votar, inscribirte, iniciar trámites) queda guardado en el navegador. "Reiniciar demo" al pie lo borra. Botón **AA** arriba: letra grande para adultos mayores.

## Rufino
- Aparece volando al entrar, te saluda y te cuenta lo importante del día.
- Respondé escribiendo o con el **micrófono**. Si le hablaste, después de contestar vuelve a escucharte (conversación continua).
- Te **lleva a la pantalla** correcta y **vuela hasta el botón** que necesitás, señalándolo.
- La primera vez que entrás a algunas pantallas te da un consejo (se apaga con 💡).
- Tiene vida propia: parpadea, te sigue con la mirada, picotea, camina y se acicala.
- Sugerencias que cambian según la pantalla y según lo que preguntaste.

### Cómo responde
1. **Gemini** (`api/chat.js`) con todo el conocimiento de la cooperativa, la cuenta de la asociada y el estado actual de la app (si ya votó, si pagó, en qué pantalla está). También responde preguntas generales.
2. Si Gemini no está disponible (abierto con doble clic, sin key o sin cuota), responde el **modo guionado** (`mascota/guion.js`), que cubre las preguntas más comunes.

### Voz
- **Voz natural** con Gemini TTS (`api/voz.js`), en tono rioplatense cálido. Si no está disponible, usa automáticamente la mejor voz del navegador (en Edge, las voces "Natural" suenan muy bien).
- El pico se mueve siguiendo el volumen real del audio.

## Archivos
```
index.html            estructura
css/app.css           diseño (colores del logo ViCa)
js/datos.js           ⭐ TODOS los datos (planes, cuotas, obra, reuniones...). Editá acá.
js/app.js             pantallas e interacciones
mascota/conocimiento.js  lo que sabe Rufino (se arma solo desde datos.js)
mascota/guion.js      respuestas sin IA
mascota/mascota.js    personaje, movimientos, voz y micrófono
mascota/mascota.css   dibujo y animaciones
api/chat.js           Gemini (texto)
api/voz.js            Gemini (voz natural)
img/                  logo y organigrama
```

## Subir a Vercel
1. Subí la carpeta a un repo de GitHub e importalo en Vercel (no necesita build).
2. Creá una API key gratis en **Google AI Studio**.
3. En Vercel → Project → Settings → **Environment Variables**: `GEMINI_API_KEY` = tu key.
4. Redeploy.

Variables opcionales: `GEMINI_MODEL` (modelo de texto), `GEMINI_TTS_MODEL` y `GEMINI_VOZ` (voz, por defecto "Achird"), `DESACTIVAR_VOZ_NATURAL=1` para usar solo la voz del navegador y ahorrar cuota.

Si un modelo no existe o se quedó sin cuota gratis, la API prueba automáticamente el siguiente.

⚠️ En el plan gratis de Gemini, Google puede usar los mensajes para mejorar sus productos. No cargues datos personales reales.

## Probar en tu compu
- **Doble clic en `index.html`**: anda todo, con Rufino en modo guionado y voz del navegador.
- **Con Gemini**: `npm i -g vercel` y después `vercel dev` dentro de la carpeta, con un archivo `.env.local` que tenga `GEMINI_API_KEY=...`.

El micrófono funciona en Chrome y Edge, y necesita HTTPS (Vercel) o localhost.
