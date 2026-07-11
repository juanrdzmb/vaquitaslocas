import { describe, expect, it } from "vitest";
import {
  formatDate,
  googleDirectionsUrl,
  googleMapsUrl,
  googleMultiStopDirectionsUrl,
  GOOGLE_MAPS_ROUTE_MAX_STOPS,
} from "../lib/utils";
import { deriveTripTheme } from "../lib/trip-theme";

describe("travel utilities", () => {
  it("formats date-only values without shifting to the previous day", () => {
    expect(formatDate("2027-04-15")).toMatch(/15/);
  });

  it("builds valid maps and directions URLs", () => {
    const place = new URL(googleMapsUrl({ query: "The Morgan Library, New York", lat: 41.88, lng: -87.63 }));
    expect(place.pathname).toBe("/maps/search/");
    expect(place.searchParams.get("query")).toBe("The Morgan Library, New York");
    expect(place.searchParams.has("origin")).toBe(false);
    expect(googleDirectionsUrl({ destination: "The Morgan Library", travelMode: "walking" })).toContain(
      "travelmode=walking"
    );
  });

  it("builds an ordered multi-stop route without using the current device as origin", () => {
    const route = googleMultiStopDirectionsUrl({
      travelMode: "walking",
      stops: [
        { query: "Union Station, Washington DC" },
        { query: "National Gallery of Art, Washington DC" },
        { query: "DC Public Library, Washington DC" },
        { query: "Georgetown, Washington DC" },
      ],
    });
    expect(route).not.toBeNull();
    const url = new URL(route!);
    expect(url.searchParams.get("origin")).toBe("Union Station, Washington DC");
    expect(url.searchParams.get("destination")).toBe("Georgetown, Washington DC");
    expect(url.searchParams.get("waypoints")).toBe(
      "National Gallery of Art, Washington DC|DC Public Library, Washington DC"
    );
  });

  it("keeps multi-stop links inside the reliable mobile waypoint limit", () => {
    const stops = Array.from({ length: 12 }, (_, index) => ({ query: `Lugar ${index + 1}, Chicago` }));
    const route = new URL(googleMultiStopDirectionsUrl({ stops })!);
    const waypoints = route.searchParams.get("waypoints")?.split("|") ?? [];
    expect(GOOGLE_MAPS_ROUTE_MAX_STOPS).toBe(5);
    expect(waypoints).toHaveLength(3);
    expect(route.searchParams.get("destination")).toBe("Lugar 5, Chicago");
  });

  it("derives a stable, destination-specific theme", () => {
    const first = deriveTripTheme("Chicago · New York · Washington");
    const second = deriveTripTheme("Chicago · New York · Washington");
    const coast = deriveTripTheme("Mallorca");
    expect(first).toEqual(second);
    expect(first.id).not.toBe(coast.id);
  });
});
