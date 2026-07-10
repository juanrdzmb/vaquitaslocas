import * as XLSX from "xlsx";
import type { RawSheet } from "./schema";

export async function parseExcelFile(file: File): Promise<RawSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets: RawSheet[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    return { name, rows };
  });

  return sheets.filter((s) => s.rows.length > 0);
}

export function summarizeSheetsForPrompt(sheets: RawSheet[]): string {
  const parts = sheets.map((sheet) => {
    const headerKeys = Object.keys(sheet.rows[0] ?? {});
    const previewRows = sheet.rows.slice(0, 25);
    const headerLine = headerKeys.join(" | ");
    const dataLines = previewRows.map((row) =>
      headerKeys.map((k) => String(row[k] ?? "").trim()).join(" | ")
    );
    return `### ${sheet.name} (${sheet.rows.length} filas)\n${headerLine}\n${dataLines.join("\n")}`;
  });
  return parts.join("\n\n---\n\n");
}

export function clipForTokenBudget(text: string, maxChars = 8000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[...contenido recortado por longitud...]";
}
