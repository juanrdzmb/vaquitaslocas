import { NextResponse } from "next/server";
import { parseExcelFile, summarizeSheetsForPrompt } from "@/lib/excel";
import { structureTripWithAI } from "@/lib/deepseek";
import { createTrip } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "El archivo es demasiado grande o el formato es inválido. Máximo 15 MB." },
        { status: 413 }
      );
    }

    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 }
      );
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo supera el límite de 15 MB." },
        { status: 413 }
      );
    }

    const name = file.name.toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usa .xlsx, .xls o .csv" },
        { status: 415 }
      );
    }

    const sheets = await parseExcelFile(file);
    if (!sheets.length) {
      return NextResponse.json(
        { error: "El archivo no contiene hojas con datos." },
        { status: 422 }
      );
    }

    const sheetsText = summarizeSheetsForPrompt(sheets);

    const tripData = await structureTripWithAI(sheetsText);
    const trip = await createTrip(tripData);

    return NextResponse.json({ id: trip.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error generando el viaje.";
    const status = message.includes("DEEPSEEK_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
