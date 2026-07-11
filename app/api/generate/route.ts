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
    const workbook = normalizeWorkbookPayload(body.workbook);
    const workbookText = serializeWorkbookForPrompt(workbook);
    const tripData = await structureTripWithAI(workbookText, {
      fileName: workbook.fileName,
      sheetCount: workbook.sheets.length,
    });
    const trip = await createTrip(tripData);

    return NextResponse.json(
      {
        id: trip.id,
        imported: {
          sheets: workbook.sheets.length,
          cells: workbookCellCount(workbook),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    if (err instanceof WorkbookValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "Error generando el viaje.";
    console.error("Trip generation failed", err);
    const publicMessage =
      message.includes("DEEPSEEK_API_KEY") || message.includes("base de datos")
        ? "La app todavía no está completamente configurada en el servidor."
        : message.startsWith("DeepSeek") || message.startsWith("El itinerario") || message.startsWith("La generación") || message.startsWith("No pude")
          ? message
          : "No pude crear la guía esta vez. Inténtalo de nuevo.";
    const status = message.includes("configur") || message.includes("base de datos") ? 503 : 500;
    return NextResponse.json({ error: publicMessage }, { status });
  }
}
