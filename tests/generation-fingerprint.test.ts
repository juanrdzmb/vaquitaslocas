import { describe, expect, it } from "vitest";
import { generationFingerprint } from "../lib/generation-fingerprint";
import type { ExtractedWorkbook } from "../lib/schema";

function workbook(value: string, fileName = "viaje.xlsx"): ExtractedWorkbook {
  return {
    fileName,
    fileSize: 100,
    sheets: [
      {
        name: "Día 1",
        rows: [{ row: 1, cells: [{ column: 0, value }] }],
      },
    ],
  };
}

describe("generation fingerprint", () => {
  it("reuses the same semantic workbook even if file metadata changes", () => {
    expect(generationFingerprint(workbook("Castillo", "uno.xlsx"))).toBe(
      generationFingerprint({ ...workbook("Castillo", "dos.xlsx"), fileSize: 9_999 })
    );
  });

  it("invalidates the cache when a cell changes", () => {
    expect(generationFingerprint(workbook("Castillo"))).not.toBe(
      generationFingerprint(workbook("Museo"))
    );
  });
});
