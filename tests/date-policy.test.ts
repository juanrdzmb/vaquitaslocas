import { describe, expect, it } from "vitest";
import { applySourceDatePolicy } from "../lib/deepseek";
import type { Trip } from "../lib/schema";

describe("source date policy", () => {
  it("removes a model-invented year when only historical years exist", () => {
    const trip: Omit<Trip, "id" | "createdAt"> = {
      title: "Viaje",
      subtitle: "",
      destination: "Estados Unidos",
      startDate: "2026-04-15",
      endDate: "2026-04-27",
      travelers: 1,
      currency: "EUR",
      overview: "",
      highlights: [],
      tips: [],
      itinerary: [
        {
          dayNumber: 1,
          date: "2026-04-15",
          title: "Chicago",
          summary: "",
          stops: [],
        },
      ],
      budget: [],
      recommendations: [],
      transport: [
        {
          id: "flight",
          type: "flight",
          date: "2026-04-15",
          route: "Madrid-Chicago",
          departure: "Madrid",
          arrival: "Chicago",
          departureTime: null,
          arrivalTime: null,
          duration: null,
          price: null,
          currency: "EUR",
          notes: null,
          coordinates: null,
        },
      ],
      hotels: [
        {
          id: "hotel",
          name: "Hotel",
          city: "Chicago",
          checkInDate: "2026-04-15",
          checkOutDate: "2026-04-18",
          checkInTime: null,
          checkOutTime: null,
          address: null,
          pricePerNight: null,
          nights: 3,
          totalPrice: null,
          currency: "EUR",
          paymentStatus: "unknown",
          cancellationDeadline: "2026-04-13",
          notes: null,
          coordinates: null,
        },
      ],
      mapCenter: null,
    };

    applySourceDatePolicy(
      trip,
      "15 Abril: Madrid-Chicago. Edificio terminado en 1924. Biblioteca fundada en 1917."
    );

    expect(trip.startDate).toBeNull();
    expect(trip.endDate).toBeNull();
    expect(trip.itinerary[0].date).toBe("15 abril");
    expect(trip.transport[0].date).toBe("15 abril");
    expect(trip.hotels[0].checkOutDate).toBe("18 abril");
    expect(trip.hotels[0].cancellationDeadline).toBe("13 abril");
  });
});
