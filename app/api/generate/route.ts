import { NextResponse } from "next/server";
import { structureTripWithAI } from "@/lib/deepseek";
import { createTrip } from "@/lib/db";
import {
  normalizeWorkbookPayload,
  serializeWorkbookForPrompt,
  WorkbookValidationError,
  workbookCellCount,
} from "@/lib/workbook";
import { clientAddress, takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type GenerationEvent =
  | { type: "progress"; progress: number; label: string }
  | { type: "complete"; progress: 1; label: string; id: string; imported: { sheets: number; cells: number } }
  | { type: "error"; error: string };

function publicGenerationError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Error generando el viaje.";
  console.error("Trip generation failed", err);
  if (message.includes("DEEPSEEK_API_KEY") || message.includes("base de datos")) {
    return "La app todavía no está completamente configurada en el servidor.";
  }
  if (
    message.startsWith("DeepSeek") ||
    message.startsWith("El itinerario") ||
    message.startsWith("La generación") ||
    message.startsWith("No pude")
  ) {
    return message;
  }
  return "No pude crear la guía esta vez. Inténtalo de nuevo.";
}

export async function POST(request: Request) {
  const limit = takeRateLimit(`generate:${clientAddress(request)}`, {
    limit: 4,
    windowMs: 15 * 60 * 1_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Hay varias guías procesándose. Espera un poco y vuelve a intentarlo." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let workbook: ReturnType<typeof normalizeWorkbookPayload>;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "La app necesita preparar el Excel en el dispositivo antes de enviarlo." },
        { status: 415 }
      );
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El libro contiene demasiado texto para procesarlo de una vez." },
        { status: 413 }
      );
    }
    const body = (await request.json()) as { workbook?: unknown };
    workbook = normalizeWorkbookPayload(body.workbook);
  } catch (err) {
    if (err instanceof WorkbookValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "No pude leer los datos preparados del Excel." }, { status: 400 });
  }

  const workbookText = serializeWorkbookForPrompt(workbook);
  const imported = {
    sheets: workbook.sheets.length,
    cells: workbookCellCount(workbook),
  };
  const encoder = new TextEncoder();
  const generationController = new AbortController();
  const abortFromRequest = () => generationController.abort();
  request.signal.addEventListener("abort", abortFromRequest, { once: true });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerationEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // El navegador puede haber cancelado la importación.
        }
      };

      send({
        type: "progress",
        progress: 0.855,
        label: `${imported.sheets} hojas y ${imported.cells} celdas útiles. Ni una imagen gigante logró colarse…`,
      });

      try {
        const tripData = await structureTripWithAI(
          workbookText,
          { fileName: workbook.fileName, sheetCount: imported.sheets },
          (event) => send({ type: "progress", ...event }),
          generationController.signal
        );
        send({ type: "progress", progress: 0.99, label: "Guardando el viaje. La base de datos está haciendo su única repetición pesada…" });
        const trip = await createTrip(tripData);
        send({
          type: "complete",
          progress: 1,
          label: "Lista. Ni el Excel puede retenerte ya.",
          id: trip.id,
          imported,
        });
      } catch (err) {
        if (!request.signal.aborted) {
          send({ type: "error", error: publicGenerationError(err) });
        }
      } finally {
        request.signal.removeEventListener("abort", abortFromRequest);
        try {
          controller.close();
        } catch {
          // Ya fue cerrado por el cliente.
        }
      }
    },
    cancel() {
      generationController.abort();
      request.signal.removeEventListener("abort", abortFromRequest);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
