import { describe, expect, it } from "vitest";
import { geocodeResultMatches } from "../lib/maps";

describe("place verification", () => {
  it("requires both the business identity and destination", () => {
    expect(
      geocodeResultMatches(
        "Globe Bookstore and Café",
        "Praga, República Checa",
        "Globe Bookstore and Cafe, Pštrossova, Nové Město, Praha, Česko"
      )
    ).toBe(true);
    expect(
      geocodeResultMatches(
        "Central Café",
        "Budapest, Hungría",
        "Central Cafe, Vienna, Austria"
      )
    ).toBe(false);
    expect(
      geocodeResultMatches(
        "Globe Bookstore and Café",
        "Praga, República Checa",
        "Globe Theatre, London, United Kingdom"
      )
    ).toBe(false);
  });
});
