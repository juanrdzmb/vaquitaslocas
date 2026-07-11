# VaquitasLocas

Una app de viaje hecha para Amanda: convierte sus Excel en una guía móvil única con itinerario, reservas, presupuesto por moneda, mapa, recomendaciones personales y un “Juan de bolsillo” con contexto del viaje.

## Qué cambió en esta versión

- Los Excel se leen en el navegador. Las imágenes y el formato pesado no pasan por la Function de Vercel; solo se envían celdas útiles y enlaces explícitos.
- Se procesan todas las hojas con un presupuesto repartido entre ellas. Ya no se pierden los últimos días por un recorte de 8.000 caracteres.
- DeepSeek usa `deepseek-v4-flash`, salida JSON validada y normalización tolerante a campos incompletos.
- Curaduría fija para Amanda: lectura, comida vegetariana real, entrenamiento y paseos.
- Tema visual determinista por destino, portada tipo pasaporte, tarjeta “Ahora / Después” y dock móvil.
- Progreso de paradas y conversación guardados en el dispositivo.
- Acciones de Maps, calendario `.ics`, impresión/PDF por día, compartir, reservas y check-in cuando existe un enlace real.
- Maps separa **Ver lugar** de **Cómo llegar** y permite montar una ruta ordenada de hasta cinco lugares sin partir de la ubicación actual.
- La generación responde como NDJSON en streaming: el porcentaje avanza con texto realmente recibido de DeepSeek y solo llega al 100 % cuando Neon ya guardó la guía.
- Fotografías por destino desde Wikimedia Commons con crédito/licencia visibles, iconos duotono de Phosphor (MIT) y stickers PNG propios.
- Neon Postgres con `DATABASE_URL`; JSON local únicamente en desarrollo.
- Totales separados por moneda, geolocalización bajo permiso y mapa sin ubicaciones ficticias.

### El caso `USA_Final.xlsx`

El archivo real pesa 9.543.735 bytes porque contiene 17 PNG incrustados. El importador lo reduce a un JSON de 84.539 bytes con 15 hojas y 1.058 celdas útiles, por debajo del límite de 4,5 MB de Vercel, sin perder Chicago, Nueva York, Washington ni la vuelta.

## Desarrollo local

Requisitos: Node.js 20 o posterior, una clave de DeepSeek y, opcionalmente, Neon.

```bash
npm install
```

Copia `.env.example` a `.env.local` y configura al menos:

```env
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-v4-flash
```

Sin `DATABASE_URL`, el modo desarrollo guarda viajes en `local-db/` (ignorado por Git). En producción la app falla de forma explícita si no hay base de datos; nunca intenta persistir en el filesystem efímero de Vercel.

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Cambiar la personalidad, los secretos y los PNG

No hace falta buscar el prompt entre la lógica de la API:

- `config/juan-personality.ts`: rasgos de Juan, palabras prohibidas, límites del humor, referencias literarias y ejemplos de tono bueno/malo.
- `config/easter-eggs.ts`: texto, posición y `href` de cada secreto. Sustituye `href: "#"` por tu enlace; mientras siga en `#`, el sticker abre solo el mensaje troll.
- `public/stickers/`: `coffee-detective.png`, `powerlifting-cow.png` y `tragic-book.png`. Puedes reemplazarlos conservando el nombre o cambiar la ruta en la configuración.

Los PNG tienen fondo transparente y 560 × 560 px. Para que la página siga rápida, intenta que cualquier reemplazo pese menos de 400 KB. Las animaciones y el respeto a `prefers-reduced-motion` están en `components/EasterEggSticker.tsx`.

Las fotos de destino no requieren API key. `lib/destination-image.ts` traduce el país o ciudad detectado, exige que el resultado de Commons coincida con el lugar y vuelve al tema gráfico local si no encuentra una imagen fiable.

## Neon y Vercel

1. En el proyecto de Vercel abre **Storage / Marketplace**.
2. Instala o conecta **Neon Postgres** al proyecto.
3. Verifica que Vercel haya creado `DATABASE_URL` para Production y Preview.
4. Añade `DEEPSEEK_API_KEY` como variable sensible.
5. Despliega de nuevo.

La tabla y las columnas nuevas se crean/migran de forma idempotente al primer acceso. `schema.sql` contiene el mismo esquema si prefieres ejecutarlo desde el editor SQL de Neon.

Los proyectos antiguos que todavía exponen `POSTGRES_URL` siguen funcionando como compatibilidad temporal.

## Scripts

```bash
npm run dev        # servidor local
npm run typecheck  # TypeScript
npm run lint       # Next/ESLint
npm test           # Vitest
npm run build      # build de producción
npm run start      # servir el build
```

## Arquitectura

```text
app/
  page.tsx                 importación local y generación
  trip/[id]/page.tsx       guía persistida
  api/generate/route.ts    JSON compacto -> DeepSeek -> Neon
  api/chat/route.ts        chat contextual por streaming
  api/places/route.ts      lugares cercanos de OpenStreetMap
components/                experiencia responsive, mapa, reservas, PDF y chat
config/                    voz de Juan y easter eggs editables
lib/
  excel-client.ts          extracción sparse en el navegador
  workbook.ts              validación y prompt de todas las hojas
  deepseek.ts              prompts, normalización y chat Juan
  destination-image.ts     imagen libre y acreditada por destino
  db.ts                    Neon + fallback local de desarrollo
  trip-theme.ts            identidad visual por destino
tests/                     regresiones de importación, fechas, tema y calendario
public/stickers/           PNG transparentes de los secretos
```

## Privacidad y límites

- El archivo binario original no se guarda ni se envía a DeepSeek; sí se envía el texto útil de sus celdas para generar la guía.
- Los viajes contienen datos personales de viaje y se comparten mediante una URL no indexada. No guardes PNR, contraseñas ni documentos en el Excel.
- La ubicación actual solo se solicita al pulsar el botón correspondiente y se mantiene en memoria durante esa sesión.
- Las APIs aplican validación, límites de tamaño y rate limiting básico por instancia. Para un despliegue público de alto tráfico conviene sumar Vercel Firewall o Upstash.
- Los enlaces de check-in/gestión solo se tratan como directos si estaban presentes en el Excel. En caso contrario se ofrece una búsqueda oficial claramente etiquetada.
