import { getTrip } from "@/lib/db";
import { streamChat } from "@/lib/deepseek";
import { clientAddress, takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  tripId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
};

export async function POST(request: Request) {
  const limit = takeRateLimit(`chat:${clientAddress(request)}`, {
    limit: 30,
    windowMs: 5 * 60 * 1_000,
  });
  if (!limit.allowed) {
    return new Response("Demasiados mensajes. Espera un momento.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 60_000) {
    return new Response("La conversación es demasiado larga.", { status: 413 });
  }

  let body: Partial<Body>;
  try {
    body = (await request.json()) as Partial<Body>;
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const { tripId, history, message } = body;
  if (
    typeof tripId !== "string" ||
    !/^[A-Za-z0-9_-]{6,40}$/.test(tripId) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 2_000
  ) {
    return new Response("Faltan parámetros", { status: 400 });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (entry): entry is { role: "user" | "assistant"; content: string } =>
            Boolean(entry) &&
            (entry.role === "user" || entry.role === "assistant") &&
            typeof entry.content === "string"
        )
        .slice(-12)
        .map((entry) => ({ ...entry, content: entry.content.slice(0, 2_000) }))
    : [];

  let trip;
  try {
    trip = await getTrip(tripId);
  } catch (error) {
    console.error("Chat trip lookup failed", error);
    return new Response("No pude abrir el viaje ahora mismo.", { status: 503 });
  }
  if (!trip) {
    return new Response("Viaje no encontrado", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChat(trip, safeHistory, message.trim(), (delta) => {
          controller.enqueue(encoder.encode(delta));
        }, request.signal);
      } catch (err) {
        if (!request.signal.aborted) {
          const msg = err instanceof Error ? err.message : "No pude responder ahora mismo.";
          controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // The client may have closed the stream already.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
