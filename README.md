# 🐄 VaquitasLocas

Convierte un Excel de viaje en una **página web editorial** con itinerario, presupuesto, mapa interactivo, recomendaciones curatoriales y un chat con Juan, tu guía. Hecho con Next.js, DeepSeek y OpenStreetMap.

> Sube el Excel → se estructura todo → obtienes una URL lista para compartir.

---

## ✨ Qué hace

- **Lee tu Excel** (`.xlsx`, `.xls`, `.csv`, una o varias hojas) con SheetJS.
- **DeepSeek interpreta** el contenido y construye un itinerario día por día, presupuesto desglosado, highlights y tips prácticos — escritos en primera persona para Amanda.
- **Curaduría**: joyas ocultas, restaurantes auténticos, librerías y bibliotecas, miradores, experiencias locales — cada una con su razón de encaje y enlace a Google Maps.
- **Mapa interactivo** (Leaflet + OpenStreetMap, gratis, sin API key) con todas las paradas y recomendaciones geolocalizadas.
- **Descubrir lugares cercanos** con un clic, usando la Overpass API de OpenStreetMap.
- **Chat con Juan** flotante que responde sobre tu viaje con streaming en vivo. Juan es un guía colombiano experto con mucha personalidad.
- **Modo oscuro** con toggle y soporte de sistema.
- **Responsive** mobile-first con safe areas para iOS.
- **Diseño editorial** minimalista (tipografía Fraunces + Geist), animaciones con Framer Motion.
- **URL única** compartible para cada viaje, persistida en Vercel Postgres (o local en JSON durante el desarrollo).

---

## 🚀 Empezar en local

### 1. Requisitos
- Node.js 18+ (recomendado 20+)
- Una API key de DeepSeek: https://platform.deepseek.com/api_keys
- (Opcional para local) una BD Vercel Postgres — ver paso 4

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el ejemplo y rellena tu key:
```bash
cp .env.example .env.local
```
Abre `.env.local` y pon tu clave real:
```env
DEEPSEEK_API_KEY=sk-tu-clave-real-aqui
```

### 4. Base de datos en local

**Opción A (recomendada): Vercel Postgres desde el dashboard**
1. Crea un proyecto gratis en https://vercel.com y sube este repo.
2. En el dashboard → **Storage** → **Create Database** → **Postgres (Neon)**.
3. Vercel inyecta las variables `POSTGRES_*` automáticamente en deploy.
4. Para local: en la misma página de la BD pulsa **`.env.local`** → copia las variables a tu `.env.local`.

**Opción B: sin Postgres todavía**
La app requiere Postgres para guardar los viajes. Si quieres probar solo la subida sin guardar, tendrías que adaptar `lib/db.ts`.

### 5. Arrancar
```bash
npm run dev
```
Abre http://localhost:3000, arrastra un Excel y… listo.

---

## 🌐 Desplegar en Vercel

1. **Sube el repo a GitHub**
   ```bash
   git init
   git add .
   git commit -m "VaquitasLocas: generador de páginas de viaje con IA"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/vaquitaslocas.git
   git push -u origin main
   ```

2. **Importa en Vercel**
   - Ve a https://vercel.com/new
   - Importa tu repo `vaquitaslocas`
   - Framework Preset: **Next.js** (lo detecta solo)
   - Root Directory: `./` (por defecto)

3. **Crea la base de datos Postgres**
   - En el proyecto en Vercel → pestaña **Storage**
   - **Create Database** → **Postgres (Neon)** → sigue los pasos (gratis)
   - Vercel la vincula y **inyecta las variables `POSTGRES_*`** en el entorno automáticamente

4. **Añade la API key de DeepSeek**
   - Settings → **Environment Variables**
   - Añade:
     ```
     DEEPSEEK_API_KEY = sk-tu-clave-real
     ```
   - (Opcional) `NEXT_PUBLIC_APP_URL` con tu dominio de Vercel, ej. `https://vaquitaslocas.vercel.app`

5. **Deploy**
   - Pulsa **Deploy** y espera ~1 min.
   - La tabla `trips` se crea sola al primer viaje (ver `lib/db.ts → ensureSchema`).

6. **¡Listo!** Comparte la URL con tu amiga, sube su Excel y disfruta.

---

## 🔐 Seguridad de las API keys

- `DEEPSEEK_API_KEY` vive **solo en el servidor** (route handlers / server actions). Nunca se expone al navegador.
- No la subas a git: `.env.local` está en `.gitignore`.
- En Vercel, marca las variables como **Sensitive** para que no se vean en logs.
- El chat y la generación pasan por rutas del backend; el cliente solo ve respuestas, no la key.

### Si más adelante quieres Google Maps en lugar de Leaflet
Google Maps Platform requiere tarjeta de crédito (tier de $200/mes gratis). Para cambiarlo:
1. Consigue una key en https://console.cloud.google.com → habilita **Maps JavaScript API** y **Places API**.
2. **Restringe la key** por dominio HTTP (tu URL de Vercel) en credenciales.
3. Añádela como env var `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
4. Sustituye `components/TripMap.tsx` por `@react-google-maps/api` y `/api/places` por la Places API.

No es necesario para empezar: Leaflet + OpenStreetMap es gratis y sin fricción.

---

## 🧱 Estructura

```
app/
  layout.tsx              Fuentes, tema, metadata global
  globals.css             Sistema de diseño editorial + overrides Leaflet
  page.tsx                Home: dropzone + hero
  trip/[id]/
    page.tsx              Página generada del viaje (SSR desde Postgres)
    not-found.tsx
  api/
    generate/route.ts     POST Excel → DeepSeek → Postgres → id
    chat/route.ts         POST → streaming DeepSeek sobre el viaje
    places/route.ts       GET → Overpass (lugares cercanos)
components/               Upload, Hero, Itinerary, Budget, Map, Recs, Chat…
lib/
  schema.ts               Tipos del viaje + helpers de recomendaciones
  excel.ts                SheetJS: parseo + resumen para el prompt
  deepseek.ts             Cliente IA + prompts (estructurar y chatear)
  db.ts                   Vercel Postgres (createTrip / getTrip)
  maps.ts                 Nominatim + Overpass (geocoding + cercanos)
  utils.ts                cn, formato de fechas y moneda
schema.sql                Esquema de la tabla (opcional, se crea sola)
```

---

## 🎨 Filosofía de diseño

Editorial minimalista inspirado en sitios premiados de awwwards:
- Tipografía **Fraunces** (serif con personalidad) para títulos display.
- **Geist** para texto, **Geist Mono** para etiquetas y datos.
- Paleta cálida: hueso (`#F5F1EA`), tinta (`#1A1A1A`), acento terracota (`#B5532F`).
- Numeración de secciones tipo revista, líneas finas separadoras, mucho aire.
- Microinteracciones suaves (fade-up al scroll, parallax sutil) con Framer Motion.
- Mapa con tiles Carto Voyager para que no romper la armonía cromática.

---

## 🛠️ Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servir build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

Hecho con cariño para alguien especial. ✶
