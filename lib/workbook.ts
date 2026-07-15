import type {
  ExtractedWorkbook,
  TripSourceWorkbook,
  WorkbookCellInput,
  WorkbookImageInput,
  WorkbookRowInput,
  WorkbookSheetInput,
} from "./schema";

export const WORKBOOK_LIMITS = {
  maxSourceBytes: 40 * 1024 * 1024,
  maxSheets: 60,
  maxRowsPerSheet: 4_000,
  maxCellsPerRow: 200,
  maxCells: 50_000,
  maxCellChars: 1_200,
  maxTextChars: 900_000,
  maxImages: 16,
  maxImageBytes: 650 * 1024,
  maxImageBytesTotal: 1_400 * 1024,
} as const;

export class WorkbookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkbookValidationError";
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxChars: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+$/g, "")
    .slice(0, maxChars);
}

function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function safeImageDataUrl(value: unknown): { dataUrl: string; bytes: number } | null {
  if (typeof value !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
    value.trim()
  );
  if (!match) return null;
  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  const bytes = Math.floor((match[2].length * 3) / 4) - padding;
  if (bytes <= 0 || bytes > WORKBOOK_LIMITS.maxImageBytes) return null;
  return { dataUrl: value.trim(), bytes };
}

export function normalizeWorkbookPayload(value: unknown): ExtractedWorkbook {
  if (!isRecord(value)) {
    throw new WorkbookValidationError("No se recibió un libro válido.");
  }

  const fileName = cleanText(value.fileName, 180).trim() || "viaje.xlsx";
  const fileSize = Number(value.fileSize ?? 0);
  if (!Number.isFinite(fileSize) || fileSize < 0) {
    throw new WorkbookValidationError("El tamaño del archivo no es válido.");
  }
  if (fileSize > WORKBOOK_LIMITS.maxSourceBytes) {
    throw new WorkbookValidationError(
      "El Excel supera 40 MB. Quita imágenes muy pesadas o divide el libro."
    );
  }

  if (!Array.isArray(value.sheets) || value.sheets.length === 0) {
    throw new WorkbookValidationError("El Excel no contiene hojas con texto útil.");
  }
  if (value.sheets.length > WORKBOOK_LIMITS.maxSheets) {
    throw new WorkbookValidationError(
      `El libro tiene demasiadas hojas (máximo ${WORKBOOK_LIMITS.maxSheets}).`
    );
  }

  let totalCells = 0;
  let totalTextChars = 0;
  let totalImages = 0;
  let totalImageBytes = 0;
  const sheets: WorkbookSheetInput[] = [];

  for (const rawSheet of value.sheets) {
    if (!isRecord(rawSheet) || !Array.isArray(rawSheet.rows)) continue;
    const name = cleanText(rawSheet.name, 80).trim() || `Hoja ${sheets.length + 1}`;
    if (rawSheet.rows.length > WORKBOOK_LIMITS.maxRowsPerSheet) {
      throw new WorkbookValidationError(
        `La hoja “${name}” supera ${WORKBOOK_LIMITS.maxRowsPerSheet.toLocaleString("es-ES")} filas útiles.`
      );
    }

    const rows: WorkbookRowInput[] = [];
    for (const rawRow of rawSheet.rows) {
      if (!isRecord(rawRow) || !Array.isArray(rawRow.cells)) continue;
      const row = Math.trunc(Number(rawRow.row));
      if (!Number.isFinite(row) || row < 1 || row > 1_000_000) continue;
      if (rawRow.cells.length > WORKBOOK_LIMITS.maxCellsPerRow) {
        throw new WorkbookValidationError(
          `La fila ${row} de “${name}” tiene demasiadas celdas.`
        );
      }

      const cells: WorkbookCellInput[] = [];
      for (const rawCell of rawRow.cells) {
        if (!isRecord(rawCell)) continue;
        const column = Math.trunc(Number(rawCell.column));
        if (!Number.isFinite(column) || column < 0 || column > 16_383) continue;
        const cellValue = cleanText(rawCell.value, WORKBOOK_LIMITS.maxCellChars).trim();
        const url = safeHttpUrl(rawCell.url);
        if (!cellValue && !url) continue;

        totalCells += 1;
        totalTextChars += cellValue.length + (url?.length ?? 0);
        if (totalCells > WORKBOOK_LIMITS.maxCells) {
          throw new WorkbookValidationError(
            `El libro supera ${WORKBOOK_LIMITS.maxCells.toLocaleString("es-ES")} celdas con contenido.`
          );
        }
        if (totalTextChars > WORKBOOK_LIMITS.maxTextChars) {
          throw new WorkbookValidationError(
            "El libro contiene demasiado texto para procesarlo en una sola página."
          );
        }

        cells.push({ column, value: cellValue, ...(url ? { url } : {}) });
      }
      if (cells.length) {
        cells.sort((a, b) => a.column - b.column);
        rows.push({ row, cells });
      }
    }
    const images: WorkbookImageInput[] = [];
    if (Array.isArray(rawSheet.images)) {
      for (const rawImage of rawSheet.images) {
        if (!isRecord(rawImage) || totalImages >= WORKBOOK_LIMITS.maxImages) break;
        const safeImage = safeImageDataUrl(rawImage.dataUrl);
        if (!safeImage) continue;
        if (totalImageBytes + safeImage.bytes > WORKBOOK_LIMITS.maxImageBytesTotal) break;
        const row = Math.trunc(Number(rawImage.row));
        const column = Math.trunc(Number(rawImage.column));
        if (!Number.isFinite(row) || row < 1 || row > 1_000_000) continue;
        if (!Number.isFinite(column) || column < 0 || column > 16_383) continue;
        totalImages += 1;
        totalImageBytes += safeImage.bytes;
        images.push({
          id: cleanText(rawImage.id, 120).trim() || `${name}-image-${images.length + 1}`,
          row,
          column,
          dataUrl: safeImage.dataUrl,
          ...(cleanText(rawImage.alt, 240).trim()
            ? { alt: cleanText(rawImage.alt, 240).trim() }
            : {}),
        });
      }
    }
    if (rows.length || images.length) {
      rows.sort((a, b) => a.row - b.row);
      images.sort((a, b) => a.row - b.row || a.column - b.column);
      sheets.push({ name, rows, ...(images.length ? { images } : {}) });
    }
  }

  if (!sheets.length || totalCells === 0) {
    throw new WorkbookValidationError("El Excel no contiene celdas con texto útil.");
  }

  return { fileName, fileSize, sheets };
}

export function workbookCellCount(workbook: ExtractedWorkbook): number {
  return workbook.sheets.reduce(
    (sum, sheet) =>
      sum + sheet.rows.reduce((rowSum, row) => rowSum + row.cells.length, 0),
    0
  );
}

export function workbookImageCount(workbook: ExtractedWorkbook): number {
  return workbook.sheets.reduce(
    (sum, sheet) => sum + (sheet.images?.length ?? 0),
    0
  );
}

/**
 * Snapshot canónico que se guarda junto al viaje. No depende de DeepSeek:
 * si la capa de IA resume de más, cada celda y cada imagen siguen disponibles.
 */
export function buildTripSourceWorkbook(
  workbook: ExtractedWorkbook
): TripSourceWorkbook {
  return {
    fileName: workbook.fileName,
    sheetCount: workbook.sheets.length,
    cellCount: workbookCellCount(workbook),
    imageCount: workbookImageCount(workbook),
    sheets: workbook.sheets,
  };
}

export function hasExplicitTravelYear(workbookText: string): boolean {
  const months =
    "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december";
  return (
    /\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(workbookText) ||
    /\b\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}\b/.test(workbookText) ||
    new RegExp(`\\b\\d{1,2}\\s+(?:de\\s+)?(?:${months})(?:\\s+de)?\\s+(?:19|20)\\d{2}\\b`, "i").test(workbookText) ||
    new RegExp(`\\b(?:${months})\\s+\\d{1,2},?\\s+(?:19|20)\\d{2}\\b`, "i").test(workbookText)
  );
}

function columnName(index: number): string {
  let result = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function sheetToPrompt(sheet: WorkbookSheetInput): string {
  const lines = [`## HOJA: ${sheet.name}`];
  for (const row of sheet.rows) {
    const cells = row.cells.map((cell) => {
      const address = `${columnName(cell.column)}${row.row}`;
      const link = cell.url ? ` <enlace:${cell.url}>` : "";
      return `[${address}] ${cell.value}${link}`;
    });
    lines.push(cells.join(" | "));
  }
  return lines.join("\n");
}

function clipOnLine(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const marker = "\n[…hoja recortada por longitud; conserva lo anterior…]";
  const hardEnd = Math.max(0, budget - marker.length);
  const lastLine = text.lastIndexOf("\n", hardEnd);
  return `${text.slice(0, lastLine > 0 ? lastLine : hardEnd)}${marker}`;
}

/**
 * Serializes every sheet while sharing the prompt budget proportionally. This
 * avoids the old failure mode where the first sheets consumed the full budget.
 */
export function serializeWorkbookForPrompt(
  workbook: ExtractedWorkbook,
  maxChars = 120_000
): string {
  const sections = workbook.sheets.map(sheetToPrompt);
  const separatorCost = Math.max(0, sections.length - 1) * 7;
  const available = Math.max(2_000, maxChars - separatorCost);
  const total = sections.reduce((sum, section) => sum + section.length, 0);
  if (total <= available) return sections.join("\n\n---\n\n");

  const minimum = Math.max(500, Math.min(1_600, Math.floor(available / sections.length)));
  const base = sections.map((section) => Math.min(section.length, minimum));
  let remaining = Math.max(0, available - base.reduce((sum, size) => sum + size, 0));
  const extras = sections.map((section, index) => Math.max(0, section.length - base[index]));
  let extraTotal = extras.reduce((sum, size) => sum + size, 0);

  const budgets = base.map((size, index) => {
    if (!remaining || !extraTotal || !extras[index]) return size;
    const share = Math.min(extras[index], Math.floor((remaining * extras[index]) / extraTotal));
    remaining -= share;
    extraTotal -= extras[index];
    return size + share;
  });

  return sections
    .map((section, index) => clipOnLine(section, budgets[index]))
    .join("\n\n---\n\n");
}
