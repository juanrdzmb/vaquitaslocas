import { describe, expect, it } from "vitest";
import { formatDate, googleDirectionsUrl, googleMapsUrl } from "../lib/utils";
import { deriveTripTheme } from "../lib/trip-theme";

describe("travel utilities", () => {
  it("formats date-only values without shifting to the previous day", () => {
    expect(formatDate("2027-04-15")).toMatch(/15/);
  });

  it("builds valid maps and directions URLs", () => {
    expect(googleMapsUrl({ query: "Chicago", lat: 41.88, lng: -87.63 })).toContain(
      "query=Chicago"
    );
    expect(googleDirectionsUrl({ destination: "The Morgan Library", travelMode: "walking" })).toContain(
      "travelmode=walking"
    );
  });

  it("derives a stable, destination-specific theme", () => {
    const first = deriveTripTheme("Chicago · New York · Washington");
    const second = deriveTripTheme("Chicago · New York · Washington");
    const coast = deriveTripTheme("Mallorca");
    expect(first).toEqual(second);
    expect(first.id).not.toBe(coast.id);
  });
});
