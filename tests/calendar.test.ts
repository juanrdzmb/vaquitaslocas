import { describe, expect, it } from "vitest";
import { buildCalendarFile } from "../lib/calendar";

describe("calendar export", () => {
  it("creates an escaped timed event", () => {
    const calendar = buildCalendarFile({
      title: "Vuelo: Madrid, Chicago",
      date: "2027-04-15",
      startTime: "11:45",
      endTime: "14:25",
      location: "MAD; T4",
      description: "Línea uno\nLínea dos",
    });

    expect(calendar).toContain("DTSTART:20270415T114500");
    expect(calendar).toContain("SUMMARY:Vuelo: Madrid\\, Chicago");
    expect(calendar).toContain("LOCATION:MAD\\; T4");
    expect(calendar).toContain("Línea uno\\nLínea dos");
  });

  it("does not invent a year for partial dates", () => {
    expect(buildCalendarFile({ title: "Paseo", date: "15 abril" })).toBeNull();
  });
});
