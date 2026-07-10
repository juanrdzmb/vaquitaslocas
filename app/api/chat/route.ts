import { getTrip } from "@/lib/db";
import { streamChat } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  tripId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const { tripId, history, message } = body;
  if (!tripId || !message) {
    return new Response("Faltan parámetros", { status: 400 });
  }

  const trip = await getTrip(tripId);
  if (!trip) {
    return new Response("Viaje no encontrado", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChat(trip, history ?? [], message, (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error en el chat";
        controller.enqueue(
          encoder.encode(`\n\n[Error: ${msg}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
