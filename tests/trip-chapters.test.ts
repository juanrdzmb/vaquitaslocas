import { describe, expect, it } from "vitest";
import { chapterForHash, cleanChapterHash } from "../lib/trip-chapters";

const rules = [
  { id: "excel-amanda", hashes: ["excel-amanda-contenido"] },
  { id: "reservas", hashes: ["reservas-contenido"] },
  { id: "itinerario", prefixes: ["dia-"] },
  { id: "mapa", hashes: ["route-builder", "trip-map-panel"] },
  { id: "recomendaciones", hashes: ["antes-de-salir"] },
];

describe("compact trip chapters", () => {
  it("opens the right chapter for old links and nested anchors", () => {
    expect(chapterForHash(rules, "#excel-amanda")).toBe("excel-amanda");
    expect(chapterForHash(rules, "#dia-2")).toBe("itinerario");
    expect(chapterForHash(rules, "#route-builder")).toBe("mapa");
    expect(chapterForHash(rules, "#antes-de-salir")).toBe("recomendaciones");
  });

  it("decodes safe hashes and ignores unrelated anchors", () => {
    expect(cleanChapterHash("#d%C3%ADa-especial")).toBe("día-especial");
    expect(chapterForHash(rules, "#footer")).toBeNull();
    expect(chapterForHash(rules, "")).toBeNull();
  });
});
