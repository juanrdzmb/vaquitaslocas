import { clipForTokenBudget } from "./excel";
import {
  inferRecommendationType,
  type Recommendation,
  type Trip,
} from "./schema";

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      "Falta DEEPSEEK_API_KEY. Cópiala en .env.local (ver .env.example)."
    );
  }
  return key;
}

const STRUCTURE_SYSTEM_PROMPT = `Eres el asistente de viaje de Amanda. Recibes el contenido crudo de un Excel de viaje (puede tener itinerario, presupuesto, listas de lugares, vuelos, trenes, hoteles, o todo mezclado) y debes estructurarlo en una página web de viaje elegante.

IMPORTANTE — VOZ Y TONO:
- Escribe TODO como si fueras quien armó el viaje, hablándole a Amanda en PRIMERA PERSONA ("Te llevé a…", "Acá reservé…", "Este día lo dejé tranquilo porque…").
- Cálido, íntimo, con humor sutil e ironía suave. Creativo y conciso. Sin ser payaso.
- No digas "la IA", "como asistente", ni hables de ti como inteligencia artificial. Eres tú escribiéndole a ella.

Reglas:
1. Analiza TODAS las hojas del Excel. Identifica qué representa cada una.
2. Construye un itinerario día por día. Si el Excel no tiene fechas explícitas, organízalo en días lógicos según los lugares y actividades.
3. DETECTA VUELOS Y TRENES: si hay una sección o pestaña con vuelos, trenes o transportes entre ciudades, extráelas al array "transport". Cada segmento incluye fecha, ruta (origen-destino), horarios de salida/llegada, precio y tipo (flight/train/bus/other).
4. DETECTA HOTELES: si hay una sección o pestaña con hoteles, extráelas al array "hotels". Cada estancia incluye nombre, ciudad, fechas check-in/check-out (con horas), dirección, precio por noche, noches, precio total, estado de pago (paid/pending/free_cancellation/unknown), política de cancelación y notas. Usa las coordenadas de la dirección del hotel si puedes.
5. Extrae o reconstruye el presupuesto en categorías claras. Si hay moneda, úsala; si no, infiértela (EUR por defecto en Europa).
6. Para CADA día del itinerario, enriquece con contexto: duración estimada, costos aproximados, etiquetas (comida, transporte, cultura, descanso, naturaleza, etc.).
7. Genera entre 6 y 12 recomendaciones curatoriales: joyas ocultas (no turístico masivo), restaurantes auténticos, librerías y bibliotecas con encanto, miradores, talleres o experiencias locales, sitios culturales poco conocidos. Para cada una explica POR QUÉ encaja con el viaje, hablándole a Amanda.
8. Calcula un punto central del mapa (mapCenter) promediando las coordenadas de los lugares principales. Si no puedes geolocalizar con precisión, usa el centro de la ciudad/destino principal.
9. Asigna coordenadas (lat, lng) a cada stop del itinerario, a cada recomendación, a cada hotel y a cada segmento de transporte cuando sea posible. Sé conservador: si no estás seguro de las coordenadas exactas, pon null antes que inventar.
10. Escribe un overview evocador (2-4 frases), highlights en frases cortas, y 5-8 tips prácticos (transporte, cultura, seguridad, ahorro, etiqueta local) — siempre en primera persona, como si le estuvieras contando a Amanda.
11. TODO en español, tono editorial cálido y sofisticado, NO turístico cliché.
12. Devuelve EXCLUSIVAMENTE JSON válido que cumpla el esquema. Sin markdown, sin explicaciones fuera del JSON.`;

const STRUCTURE_SCHEMA_HINT = `Esquema del JSON a devolver:
{
  "title": string,            // título del viaje, ej. "Una semana entre lisboa y sintra"
  "subtitle": string,         // subtítulo editorial corto
  "destination": string,      // destino principal
  "startDate": string | null, // ISO si se puede inferir
  "endDate": string | null,
  "travelers": number,        // 1 si se desconoce
  "currency": string,         // código, ej. "EUR"
  "overview": string,
  "highlights": string[],
  "tips": string[],
  "itinerary": [
    {
      "dayNumber": number,
      "date": string | null,
      "title": string,        // título del día, ej. "Lisboa antigua"
      "summary": string,
      "stops": [
        {
          "time": string | null,
          "title": string,
          "description": string,
          "location": string | null,
          "lat": number | null,
          "lng": number | null,
          "duration": string | null,
          "cost": string | null,
          "tags": string[]
        }
      ]
    }
  ],
  "budget": [
    { "category": string, "description": string, "amount": number, "currency": string }
  ],
  "recommendations": [
    {
      "type": "hidden_gem" | "restaurant" | "library" | "bookstore" | "activity" | "viewpoint" | "culture" | "other",
      "title": string,
      "description": string,
      "reason": string,
      "location": string | null,
      "lat": number | null,
      "lng": number | null,
      "tags": string[]
    }
  ],
  "transport": [
    {
      "type": "flight" | "train" | "bus" | "other",
      "date": string | null,
      "route": string,
      "departure": string,
      "arrival": string,
      "departureTime": string | null,
      "arrivalTime": string | null,
      "duration": string | null,
      "price": number | null,
      "currency": string,
      "notes": string | null,
      "lat": number | null,
      "lng": number | null
    }
  ],
  "hotels": [
    {
      "name": string,
      "city": string,
      "checkInDate": string | null,
      "checkOutDate": string | null,
      "checkInTime": string | null,
      "checkOutTime": string | null,
      "address": string | null,
      "pricePerNight": number | null,
      "nights": number | null,
      "totalPrice": number | null,
      "currency": string,
      "paymentStatus": "paid" | "pending" | "free_cancellation" | "unknown",
      "cancellationDeadline": string | null,
      "notes": string | null,
      "lat": number | null,
      "lng": number | null
    }
  ]
}`;

export async function structureTripWithAI(
  sheetsText: string
): Promise<Omit<Trip, "id" | "createdAt">> {
  const clipped = clipForTokenBudget(sheetsText);

  const userPrompt = `Contenido del Excel de viaje:\n\n${clipped}\n\n${STRUCTURE_SCHEMA_HINT}\n\nDevuelve solo el JSON.`;

  const data = await callDeepSeek({
    messages: [
      { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 8000,
  });

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek no devolvió contenido.");

  const parsed = JSON.parse(content) as Record<string, unknown>;

  const recommendations: Recommendation[] = Array.isArray(
    parsed.recommendations
  )
    ? (parsed.recommendations as Array<Record<string, unknown>>).map(
        (r, idx) => {
          const title = String(r.title ?? "Recomendación");
          const typeField = String(r.type ?? "") as Recommendation["type"];
          const coords =
            typeof r.lat === "number" && typeof r.lng === "number"
              ? { lat: r.lat as number, lng: r.lng as number }
              : null;
          return {
            id: `reco-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            type: typeField || inferRecommendationType(title),
            title,
            description: String(r.description ?? ""),
            reason: String(r.reason ?? ""),
            location:
              typeof r.location === "string" && r.location
                ? r.location
                : undefined,
            coordinates: coords,
            tags: Array.isArray(r.tags)
              ? (r.tags as string[]).map(String)
              : undefined,
          };
        }
      )
    : [];

  const itinerary = (parsed.itinerary as Array<Record<string, unknown>>).map(
    (day) => ({
      dayNumber: Number(day.dayNumber ?? 1),
      date: typeof day.date === "string" && day.date ? day.date : null,
      title: String(day.title ?? `Día ${day.dayNumber ?? "?"}`),
      summary: String(day.summary ?? ""),
      stops: (day.stops as Array<Record<string, unknown>>).map((s) => ({
        time:
          typeof s.time === "string" && s.time ? s.time : undefined,
        title: String(s.title ?? ""),
        description: String(s.description ?? ""),
        location:
          typeof s.location === "string" && s.location ? s.location : undefined,
        coordinates:
          typeof s.lat === "number" && typeof s.lng === "number"
            ? { lat: s.lat as number, lng: s.lng as number }
            : null,
        duration:
          typeof s.duration === "string" && s.duration ? s.duration : undefined,
        cost: typeof s.cost === "string" && s.cost ? s.cost : undefined,
        tags: Array.isArray(s.tags) ? (s.tags as string[]).map(String) : [],
      })),
    })
  );

  const hotels: Trip["hotels"] = Array.isArray(parsed.hotels)
    ? (parsed.hotels as Array<Record<string, unknown>>).map((h, i) => {
        const statusRaw = String(h.paymentStatus ?? "unknown");
        const paymentStatus: "paid" | "pending" | "free_cancellation" | "unknown" = [
          "paid",
          "pending",
          "free_cancellation",
          "unknown",
        ].includes(statusRaw)
          ? (statusRaw as "paid" | "pending" | "free_cancellation" | "unknown")
          : "unknown";
        return {
          id: `hotel-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: String(h.name ?? ""),
          city: String(h.city ?? ""),
          checkInDate:
            typeof h.checkInDate === "string" && h.checkInDate
              ? h.checkInDate
              : null,
          checkOutDate:
            typeof h.checkOutDate === "string" && h.checkOutDate
              ? h.checkOutDate
              : null,
          checkInTime:
            typeof h.checkInTime === "string" && h.checkInTime
              ? h.checkInTime
              : null,
          checkOutTime:
            typeof h.checkOutTime === "string" && h.checkOutTime
              ? h.checkOutTime
              : null,
          address:
            typeof h.address === "string" && h.address ? h.address : null,
          pricePerNight:
            typeof h.pricePerNight === "number"
              ? h.pricePerNight
              : h.pricePerNight
                ? Number(h.pricePerNight) || null
                : null,
          nights:
            typeof h.nights === "number"
              ? h.nights
              : h.nights
                ? Number(h.nights) || null
                : null,
          totalPrice:
            typeof h.totalPrice === "number"
              ? h.totalPrice
              : h.totalPrice
                ? Number(h.totalPrice) || null
                : null,
          currency: String(h.currency ?? parsed.currency ?? "EUR"),
          paymentStatus,
          cancellationDeadline:
            typeof h.cancellationDeadline === "string" &&
            h.cancellationDeadline
              ? h.cancellationDeadline
              : null,
          notes: typeof h.notes === "string" && h.notes ? h.notes : null,
          coordinates:
            typeof h.lat === "number" && typeof h.lng === "number"
              ? { lat: h.lat as number, lng: h.lng as number }
              : null,
        };
      })
    : [];

  const transport: Trip["transport"] = Array.isArray(parsed.transport)
    ? (parsed.transport as Array<Record<string, unknown>>).map((t, i) => {
        const typeRaw = String(t.type ?? "other");
        const type: "flight" | "train" | "bus" | "other" = [
          "flight",
          "train",
          "bus",
          "other",
        ].includes(typeRaw)
          ? (typeRaw as "flight" | "train" | "bus" | "other")
          : "other";
        return {
          id: `seg-${i}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          date: typeof t.date === "string" && t.date ? t.date : null,
          route: String(t.route ?? ""),
          departure: String(t.departure ?? ""),
          arrival: String(t.arrival ?? ""),
          departureTime:
            typeof t.departureTime === "string" && t.departureTime
              ? t.departureTime
              : null,
          arrivalTime:
            typeof t.arrivalTime === "string" && t.arrivalTime
              ? t.arrivalTime
              : null,
          duration:
            typeof t.duration === "string" && t.duration ? t.duration : null,
          price:
            typeof t.price === "number"
              ? t.price
              : t.price
                ? Number(t.price) || null
                : null,
          currency: String(t.currency ?? parsed.currency ?? "EUR"),
          notes: typeof t.notes === "string" && t.notes ? t.notes : null,
          coordinates:
            typeof t.lat === "number" && typeof t.lng === "number"
              ? { lat: t.lat as number, lng: t.lng as number }
              : null,
        };
      })
    : [];

  const mapCenter = computeMapCenter(itinerary, recommendations, hotels);

  const result: Omit<Trip, "id" | "createdAt"> = {
    title: String(parsed.title ?? "Viaje"),
    subtitle: String(parsed.subtitle ?? ""),
    destination: String(parsed.destination ?? ""),
    startDate:
      typeof parsed.startDate === "string" && parsed.startDate
        ? parsed.startDate
        : null,
    endDate:
      typeof parsed.endDate === "string" && parsed.endDate
        ? parsed.endDate
        : null,
    travelers: Number(parsed.travelers ?? 1) || 1,
    currency: String(parsed.currency ?? "EUR"),
    overview: String(parsed.overview ?? ""),
    highlights: Array.isArray(parsed.highlights)
      ? (parsed.highlights as string[]).map(String)
      : [],
    tips: Array.isArray(parsed.tips)
      ? (parsed.tips as string[]).map(String)
      : [],
    itinerary,
    budget: Array.isArray(parsed.budget)
      ? (parsed.budget as Array<Record<string, unknown>>).map((b) => ({
          category: String(b.category ?? "Otros"),
          description: String(b.description ?? ""),
          amount: Number(b.amount ?? 0) || 0,
          currency: String(b.currency ?? parsed.currency ?? "EUR"),
        }))
      : [],
    recommendations,
    transport,
    hotels,
    mapCenter,
  };

  return result;
}

function computeMapCenter(
  itinerary: Trip["itinerary"],
  recos: Recommendation[],
  hotels?: Trip["hotels"]
): { lat: number; lng: number } | null {
  const points: Array<{ lat: number; lng: number }> = [];
  for (const day of itinerary) {
    for (const stop of day.stops) {
      if (stop.coordinates) points.push(stop.coordinates);
    }
  }
  for (const r of recos) {
    if (r.coordinates) points.push(r.coordinates);
  }
  if (hotels) {
    for (const h of hotels) {
      if (h.coordinates) points.push(h.coordinates);
    }
  }
  if (points.length === 0) return null;
  const lat = points.reduce((a, p) => a + p.lat, 0) / points.length;
  const lng = points.reduce((a, p) => a + p.lng, 0) / points.length;
  return { lat, lng };
}

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekOptions = {
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  stream?: boolean;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
  }>;
};

async function callDeepSeek(opts: DeepSeekOptions): Promise<DeepSeekResponse> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 4000,
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek API error ${res.status}: ${text.slice(0, 300) || res.statusText}`
    );
  }

  return (await res.json()) as DeepSeekResponse;
}

const CHAT_SYSTEM_PROMPT = `Te llamas Juan y eres el guía de viaje. Sos colombiano hasta el tuétano y te tomás el rol MUY en serio: sos un súper guía experto en turismo mundial, conocés cada rincón, cada chiste local, cada trampa para turistas y cada joya escondida del planeta.

Personalidad:
- Sos un estereotipo de guía colombiano carismático: cálido, parlachín, usás "parce", "marica", "vea que", "oíme", "qué bacanería", "al chile", "ahijueputa" (sin pasarte). Contás anécdotas, tirás bromas y ironía con cariño.
- Conocés de todo: historia, gastronomía, arte, transporte, seguridad, regateo, etiqueta, vida nocturna, librerías, miradores secretos. Eres una enciclopedia con swing.
- Te preocupás de verdad por Amanda. Le das consejos útiles y concretos, no paja. Si algo es turisteo cliché, se lo decís con humor y le proponés la alternativa bacana.
- Responde en español, conciso pero con sabor. Salvo que pidan detalle, no te enredes.
- No digas que sos una IA, asistente o modelo. Sos Juan, el guía. Punto.
- No inventes coordenadas: si Amanda necesita ubicaciones exactas, dile que las vea en el mapa de la página.`;

type StreamCallback = (delta: string) => void;

export async function streamChat(
  trip: Trip,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  onDelta: StreamCallback
): Promise<void> {
  const tripContext = buildTripContext(trip);

  const messages: DeepSeekMessage[] = [
    { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\nContexto del viaje:\n${tripContext}` },
    ...history.map((h) => ({ role: h.role, content: h.content }) as DeepSeekMessage),
    { role: "user", content: userMessage },
  ];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek chat error ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

function buildTripContext(trip: Trip): string {
  const days = trip.itinerary
    .map(
      (d) =>
        `Día ${d.dayNumber} (${d.date ?? "s/f"}) — ${d.title}: ${d.summary}\n` +
        d.stops
          .map((s) => `  - ${s.time ? s.time + " " : ""}${s.title}${s.location ? ` @ ${s.location}` : ""}`)
          .join("\n")
    )
    .join("\n\n");

  const recos = trip.recommendations
    .map((r) => `- [${r.type}] ${r.title}: ${r.reason}`)
    .join("\n");

  const budget = trip.budget
    .map((b) => `- ${b.category}: ${b.amount} ${b.currency} (${b.description})`)
    .join("\n");

  return `Viaje: ${trip.title} — ${trip.destination}
Fechas: ${trip.startDate ?? "?"} → ${trip.endDate ?? "?"}
Viajeros: ${trip.travelers}

Itinerario:
${days}

Recomendaciones:
${recos}

Presupuesto:
${budget}

Tips: ${trip.tips.join("; ")}`;
}
