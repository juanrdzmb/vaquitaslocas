"use client";

import { useEffect } from "react";
import type { Trip } from "@/lib/schema";
import type { DestinationImage } from "@/lib/destination-image";
import {
  parseTripLibrary,
  rememberTripCover,
  TRIP_LIBRARY_EVENT,
  TRIP_LIBRARY_STORAGE_KEY,
} from "@/lib/trip-library";

export default function RememberTrip({
  trip,
  destinationImage,
}: {
  trip: Trip;
  destinationImage?: DestinationImage | null;
}) {
  useEffect(() => {
    try {
      const now = Date.now();
      const current = parseTripLibrary(localStorage.getItem(TRIP_LIBRARY_STORAGE_KEY));
      const next = rememberTripCover(current, {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        createdAt: trip.createdAt,
        lastOpenedAt: now,
        ...(trip.visualTheme ? { visualTheme: trip.visualTheme } : {}),
        ...(destinationImage ? { coverImage: destinationImage } : {}),
      });
      localStorage.setItem(TRIP_LIBRARY_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(TRIP_LIBRARY_EVENT));
      navigator.storage?.persist?.().catch(() => false);
    } catch {
      // Safari privado puede denegar almacenamiento; el viaje sigue en Neon y en su URL.
    }
  }, [destinationImage, trip]);
  return null;
}
