import { describe, expect, it } from "vitest";
import {
  normalizeWorkbookPayload,
  hasExplicitTravelYear,
  serializeWorkbookForPrompt,
  workbookCellCount,
  WorkbookValidationError,
} from "../lib/workbook";

describe("workbook payload", () => {
  it("normalizes sparse cells and rejects unsafe links", () => {
    const workbook = normalizeWorkbookPayload({
      fileName: "viaje.xlsx",
      fileSize: 9_500_000,
      sheets: [
        {
          name: "INFO",
          rows: [
            {
              row: 3,
              cells: [
                { column: 0, value: "Madrid-Chicago\u0000" },
                { column: 1, value: "", url: "javascript:alert(1)" },
                { column: 6, value: 326, url: "https://example.com/reserva" },
              ],
            },
          ],
        },
      ],
    });

    expect(workbookCellCount(workbook)).toBe(2);
    expect(workbook.sheets[0].rows[0].cells[0].value).toBe("Madrid-Chicago");
    expect(workbook.sheets[0].rows[0].cells[1].url).toBe("https://example.com/reserva");
  });

  it("preserves every sheet when the prompt must be clipped", () => {
    const workbook = normalizeWorkbookPayload({
      fileName: "muchas-hojas.xlsx",
      fileSize: 1_000,
      sheets: Array.from({ length: 15 }, (_, sheet) => ({
        name: `Día ${sheet + 1}`,
        rows: Array.from({ length: 40 }, (_, row) => ({
          row: row + 1,
          cells: [{ column: 0, value: `Detalle ${sheet + 1}-${row + 1} ${"x".repeat(60)}` }],
        })),
      })),
    });

    const prompt = serializeWorkbookForPrompt(workbook, 12_000);
    for (let sheet = 1; sheet <= 15; sheet += 1) {
      expect(prompt).toContain(`## HOJA: Día ${sheet}`);
      expect(prompt).toContain(`Detalle ${sheet}-1`);
    }
    expect(prompt.length).toBeLessThanOrEqual(12_500);
  });

  it("rejects an empty workbook with a useful error", () => {
    expect(() =>
      normalizeWorkbookPayload({ fileName: "vacío.xlsx", fileSize: 100, sheets: [] })
    ).toThrow(WorkbookValidationError);
  });

  it("does not mistake historical facts for a travel year", () => {
    expect(
      hasExplicitTravelYear(
        "[A1] 15 Abril: Madrid-Chicago\n[A2] Edificio terminado en 1924\n[A3] Biblioteca fundada en 1917"
      )
    ).toBe(false);
    expect(hasExplicitTravelYear("[A1] Viaje del 15 abril 2027")).toBe(true);
    expect(hasExplicitTravelYear("[A1] Salida 15/04/2027")).toBe(true);
  });
});
