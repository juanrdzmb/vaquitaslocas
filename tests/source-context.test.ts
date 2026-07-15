import { describe, expect, it } from "vitest";
import { buildRelevantSourceContext } from "../lib/deepseek";
import type { Trip, TripSourceWorkbook, WorkbookSheetInput } from "../lib/schema";

function sheet(name: string, values: string[]): WorkbookSheetInput {
  return {
    name,
    rows: values.map((value, index) => ({
      row: index + 1,
      cells: [{ column: 0, value }],
    })),
  };
}

const sourceWorkbook: TripSourceWorkbook = {
  fileName: "Budapest+Praga.xlsx",
  sheetCount: 5,
  cellCount: 12,
  imageCount: 0,
  sheets: [
    sheet("Budapest-Praga", ["Resumen general", "Vuelo de ida"]),
    sheet("Restaurantes", ["BUDAPEST", "Restaurantes vegetarianos", "Napfényes Étterem"]),
    sheet("Día 2_BU", ["Budapest", "Castillo de Buda", "Recorrido por el museo"]),
    sheet("Día 2_PR", ["Praga", "Castillo de Praga"]),
    sheet("RESUMEN", ["Hotel", "Tren Budapest-Praga"]),
  ],
};

const trip: Trip = {
  id: "trip-source-context",
  title: "Budapest + Praga",
  subtitle: "",
  destination: "Budapest y Praga",
  startDate: null,
  endDate: null,
  travelers: 1,
  currency: "EUR",
  overview: "",
  highlights: [],
  tips: [],
  itinerary: [],
  budget: [],
  recommendations: [],
  transport: [],
  hotels: [],
  mapCenter: null,
  sourceWorkbook,
  createdAt: 0,
};

function selectedHeadings(context: string): string[] {
  return context
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3));
}

describe("relevant source context", () => {
  it("prioritizes the restaurant sheet for food questions", () => {
    const context = buildRelevantSourceContext(
      trip,
      "¿Qué restaurantes vegetarianos tengo apuntados?"
    );

    expect(selectedHeadings(context)[0]).toBe("Restaurantes");
    expect(context).toContain("Napfényes Étterem");
  });

  it("disambiguates day 2 using the requested city and source details", () => {
    const context = buildRelevantSourceContext(
      trip,
      "¿Qué puse para el día 2 en Budapest sobre el castillo y el museo?"
    );
    const headings = selectedHeadings(context);

    expect(headings[0]).toBe("Día 2_BU");
    expect(headings.indexOf("Día 2_BU")).toBeLessThan(headings.indexOf("Día 2_PR"));
    expect(context).toContain("Recorrido por el museo");
  });
});
