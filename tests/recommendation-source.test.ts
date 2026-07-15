import { describe, expect, it } from "vitest";
import {
  recommendationRepeatsSource,
  tipSupportedBySource,
} from "../lib/deepseek";

const source = `
## HOJA: Restaurantes
[A29] Bistro Vitkov (the leaf story)
[B27] Globe Bookstore and Café
## HOJA: Día 3_PR
[A40] Monasterio de Strahov + Biblioteca de Strahov
[A18] 20:00 Concierto clásico
`;

describe("AI additions versus Amanda's source", () => {
  it("removes places that were already in the workbook", () => {
    expect(
      recommendationRepeatsSource(
        { title: "Bistro Vitkov (the leaf story)" },
        source
      )
    ).toBe(true);
    expect(
      recommendationRepeatsSource(
        { title: "Biblioteca del Monasterio de Strahov" },
        source
      )
    ).toBe(true);
    expect(
      recommendationRepeatsSource(
        { title: "Ruta para correr por la Isla Margarita" },
        source
      )
    ).toBe(false);
  });

  it("keeps only timed tips that are traceable to a source cell", () => {
    expect(tipSupportedBySource("El concierto es a las 20:00.", source)).toBe(true);
    expect(tipSupportedBySource("Lleva efectivo por si acaso.", source)).toBe(false);
    expect(tipSupportedBySource("La visita es a las 19:30.", source)).toBe(false);
  });
});
