import { describe, expect, it } from "vitest";
import {
  diningItemsFromSheet,
  sourceCellPlaceCandidate,
  matchSourceSheetForDay,
  sourceCoverage,
  sourceSheetKind,
} from "../lib/source-workbook";
import type { TripSourceWorkbook, WorkbookSheetInput } from "../lib/schema";

const restaurants: WorkbookSheetInput = {
  name: "Restaurantes",
  rows: [
    { row: 1, cells: [{ column: 0, value: "BUDAPEST" }] },
    {
      row: 2,
      cells: [
        { column: 0, value: "Restaurantes" },
        { column: 1, value: "Cafés/Pastelerías" },
      ],
    },
    {
      row: 3,
      cells: [
        { column: 0, value: "Budapest Bagel" },
        { column: 1, value: "Három Holló" },
      ],
    },
    { row: 8, cells: [{ column: 0, value: "Vitkov Hill" }] },
  ],
};

describe("source workbook", () => {
  it("keeps every dining cell and its city/category", () => {
    const items = diningItemsFromSheet(restaurants);
    expect(items.map((item) => item.name)).toEqual([
      "Budapest Bagel",
      "Három Holló",
      "Vitkov Hill",
    ]);
    expect(items[0]).toMatchObject({ city: "BUDAPEST", category: "Restaurantes" });
    expect(items[1]).toMatchObject({ category: "Cafés/Pastelerías" });
  });

  it("does not mistake cafe and bar names for category headings", () => {
    const realShape: WorkbookSheetInput = {
      name: "Restaurantes",
      rows: [
        { row: 1, cells: [{ column: 0, value: "PRAGA" }] },
        { row: 2, cells: [
          { column: 0, value: "Restaurantes" },
          { column: 1, value: "Cafés/Pastelerías" },
          { column: 2, value: "Bar/Pub" },
        ] },
        { row: 3, cells: [
          { column: 0, value: "Lokál" },
          { column: 1, value: "Globe Bookstore and Café" },
          { column: 2, value: "BeerGeek Bar" },
        ] },
      ],
    };
    expect(diningItemsFromSheet(realShape).map((item) => item.name)).toEqual([
      "Lokál",
      "Globe Bookstore and Café",
      "BeerGeek Bar",
    ]);
  });

  it("links real place names but not ordinary descriptions or metadata", () => {
    expect(sourceCellPlaceCandidate("09:30-11:00am: Castillo de Buda")).toBe("Castillo de Buda");
    expect(sourceCellPlaceCandidate("Plaza de Adam Clark (Clark Ádám tér):")).toBe("Plaza de Adam Clark (Clark Ádám tér)");
    expect(sourceCellPlaceCandidate("Paulaner Söröző")).toBe("Paulaner Söröző");
    expect(sourceCellPlaceCandidate("No es necesario reservar entradas con antelación")).toBeNull();
    expect(sourceCellPlaceCandidate("Se inauguró en 1859 y hoy alberga exposiciones")).toBeNull();
    expect(sourceCellPlaceCandidate("Precio")).toBeNull();
    expect(sourceCellPlaceCandidate("Duración")).toBeNull();
    expect(sourceCellPlaceCandidate("Hay terrazas con vistas al río")).toBeNull();
    expect(sourceCellPlaceCandidate("El puente fue construido en 1849")).toBeNull();
    expect(sourceCellPlaceCandidate("Puedo tomarme un café de camino a la Biblioteca")).toBeNull();
    expect(sourceCellPlaceCandidate("Interior de la Basílica")).toBeNull();
  });

  it("classifies source sheets and reconciles coverage", () => {
    expect(sourceSheetKind(restaurants)).toBe("food");
    expect(sourceSheetKind({ name: "Día 2_BU", rows: [] })).toBe("days");
    const source: TripSourceWorkbook = {
      fileName: "viaje.xlsx",
      sheetCount: 1,
      cellCount: 6,
      imageCount: 1,
      sheets: [{ ...restaurants, images: [{ id: "1", row: 1, column: 0, dataUrl: "data:image/png;base64,AA==" }] }],
    };
    expect(sourceCoverage(source)).toEqual({ sheets: 1, cells: 6, images: 1 });
  });

  it("matches repeated local day numbers using the city in the itinerary title", () => {
    const source: TripSourceWorkbook = {
      fileName: "Budapest+Praga.xlsx",
      sheetCount: 4,
      cellCount: 4,
      imageCount: 0,
      sheets: [
        { name: "Día 1_BU", rows: [{ row: 1, cells: [{ column: 0, value: "Budapest" }] }] },
        { name: "Día 2_BU", rows: [{ row: 1, cells: [{ column: 0, value: "Castillo de Buda" }] }] },
        { name: "Día1_PR", rows: [{ row: 1, cells: [{ column: 0, value: "Praga" }] }] },
        { name: "Día 2_PR", rows: [{ row: 1, cells: [{ column: 0, value: "Castillo de Praga" }] }] },
      ],
    };

    expect(
      matchSourceSheetForDay(source, { dayNumber: 2, title: "Budapest · castillo y museo" })
        ?.name
    ).toBe("Día 2_BU");
    expect(
      matchSourceSheetForDay(source, { dayNumber: 8, title: "Praga · castillo y museo" })
        ?.name
    ).toBe("Día 2_PR");
  });
});
