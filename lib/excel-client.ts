"use client";

import type { ExtractedWorkbook, WorkbookCellInput } from "./schema";
import { WORKBOOK_LIMITS } from "./workbook";

export type WorkbookImportProgress = {
  progress: number;
  label: string;
};

type ProgressCallback = (state: WorkbookImportProgress) => void;

type SheetCell = {
  v?: unknown;
  w?: string;
  l?: { Target?: string };
};

const SUPPORTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function isSupportedWorkbook(file: File): boolean {
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function displayCellValue(cell: SheetCell): string {
  if (typeof cell.w === "string" && cell.w.trim()) return cell.w;
  if (cell.v instanceof Date) return cell.v.toISOString();
  if (typeof cell.v === "boolean") return cell.v ? "Sí" : "No";
  if (cell.v == null) return "";
  return String(cell.v);
}

export async function extractWorkbookInBrowser(
  file: File,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<ExtractedWorkbook> {
  if (!isSupportedWorkbook(file)) {
    throw new Error("Formato no compatible. Usa .xlsx, .xls o .csv.");
  }
  if (file.size > WORKBOOK_LIMITS.maxSourceBytes) {
    throw new Error("El archivo supera 40 MB. Quita imágenes pesadas o divide el libro.");
  }
  if (file.size === 0) throw new Error("El archivo está vacío.");

  onProgress?.({ progress: 0.08, label: "Abriendo el archivo en este dispositivo…" });
  const XLSX = await import("xlsx");
  if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");

  const buffer = await file.arrayBuffer();
  onProgress?.({ progress: 0.22, label: "Separando datos de imágenes y formato…" });
  if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");

  let book: ReturnType<typeof XLSX.read>;
  try {
    book = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      cellText: true,
      dense: false,
    });
  } catch {
    throw new Error("No pude abrir el Excel. Puede estar protegido, dañado o usar un formato no compatible.");
  }

  if (!book.SheetNames.length) throw new Error("El archivo no contiene hojas.");
  const sheets: ExtractedWorkbook["sheets"] = [];

  for (let sheetIndex = 0; sheetIndex < book.SheetNames.length; sheetIndex += 1) {
    if (signal?.aborted) throw new DOMException("Importación cancelada", "AbortError");
    const name = book.SheetNames[sheetIndex];
    const sheet = book.Sheets[name] as unknown as Record<string, SheetCell>;
    const rows = new Map<number, WorkbookCellInput[]>();

    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith("!") || !cell || typeof cell !== "object") continue;
      let decoded: { r: number; c: number };
      try {
        decoded = XLSX.utils.decode_cell(address);
      } catch {
        continue;
      }

      const value = displayCellValue(cell)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .trim();
      const url = typeof cell.l?.Target === "string" ? cell.l.Target : undefined;
      if (!value && !url) continue;

      const current = rows.get(decoded.r + 1) ?? [];
      current.push({
        column: decoded.c,
        value: value.slice(0, WORKBOOK_LIMITS.maxCellChars),
        ...(url ? { url } : {}),
      });
      rows.set(decoded.r + 1, current);
    }

    const normalizedRows = [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([row, cells]) => ({
        row,
        cells: cells.sort((a, b) => a.column - b.column),
      }));

    if (normalizedRows.length) sheets.push({ name, rows: normalizedRows });
    const sheetProgress = (sheetIndex + 1) / book.SheetNames.length;
    onProgress?.({
      progress: 0.25 + sheetProgress * 0.55,
      label: `Leyendo “${name}” (${sheetIndex + 1}/${book.SheetNames.length})…`,
    });
  }

  if (!sheets.length) throw new Error("No encontré celdas con contenido en el archivo.");
  onProgress?.({ progress: 0.84, label: "Preparando las hojas para Amanda…" });
  return { fileName: file.name, fileSize: file.size, sheets };
}
