import { describe, expect, it } from "vitest";
import { mergeDuplicateTransportSegments } from "../lib/deepseek";
import type { TransportSegment } from "../lib/schema";

function segment(
  id: string,
  type: TransportSegment["type"],
  extra: Partial<TransportSegment> = {}
): TransportSegment {
  return {
    id,
    type,
    date: "20 septiembre",
    route: "Budapest-Praga",
    departure: "Budapest",
    arrival: "Praga",
    departureTime: null,
    arrivalTime: null,
    duration: null,
    price: null,
    currency: "EUR",
    notes: null,
    coordinates: null,
    ...extra,
  };
}

describe("transport normalization", () => {
  it("keeps the detailed train and carries over a duplicate budget price", () => {
    const result = mergeDuplicateTransportSegments([
      segment("budget-row", "flight", { price: 34 }),
      segment("real-train", "train", {
        departure: "Budapest-Nyugati",
        arrival: "Praha hlavní nádraží",
        departureTime: "09:30",
        arrivalTime: "16:23",
        duration: "6h53min",
        notes: "Tren directo",
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "real-train",
      type: "train",
      price: 34,
      departureTime: "09:30",
    });
  });
});
