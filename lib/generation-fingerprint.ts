import { createHash } from "node:crypto";
import type { ExtractedWorkbook } from "./schema";

/**
 * Cambia esta versión cuando el esquema, el prompt o la personalidad alteren
 * materialmente una guía. Así el caché nunca sirve una edición antigua.
 */
export const GENERATION_VERSION = "2026-07-15-source-faithful-kinetic-v4";

function semanticWorkbook(workbook: ExtractedWorkbook) {
  return workbook.sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows.map((row) => ({
      row: row.row,
      cells: row.cells.map((cell) => ({
        column: cell.column,
        value: cell.value,
        url: cell.url ?? null,
      })),
    })),
    images: (sheet.images ?? []).map((image) => ({
      row: image.row,
      column: image.column,
      dataUrl: image.dataUrl,
      alt: image.alt ?? null,
    })),
  }));
}

export function generationFingerprint(workbook: ExtractedWorkbook): string {
  return createHash("sha256")
    .update(GENERATION_VERSION)
    .update("\0")
    .update(JSON.stringify(semanticWorkbook(workbook)))
    .digest("hex");
}
