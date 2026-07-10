"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import TripMapClient from "./TripMapClient";
import type { NearbyPlace } from "@/lib/maps";
import type { ItineraryDay, Recommendation } from "@/lib/schema";
import { recoTypeLabel } from "@/lib/schema";

type Props = {
  center: { lat: number; lng: number } | null;
  itinerary: ItineraryDay[];
  recommendations: Recommendation[];
  tripId: string;
};

export default function MapSection({
  center,
  itinerary,
  recommendations,
  tripId,
}: Props) {
  const [showNearby, setShowNearby] = useState(false);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleNearby() {
    if (showNearby) {
      setShowNearby(false);
      return;
    }
    if (!center) {
      setError("El viaje no tiene coordenadas para buscar cerca.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places?lat=${center.lat}&lng=${center.lng}&radius=1500`);
      if (!res.ok) throw new Error("No se pudieron cargar lugares cercanos.");
      const data = (await res.json()) as NearbyPlace[];
      setNearby(data);
      setShowNearby(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="mapa" className="container-editorial py-16 md:py-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">El viaje en el mapa</h2>
        <span className="section-number">03</span>
      </div>
      <div className="rule mb-10" />

      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="trip-marker trip-marker-day inline-block" />
            <span className="text-[var(--fg-muted)]">Paradas del itinerario</span>
          </span>
            <span className="flex items-center gap-2">
              <span className="trip-marker trip-marker-reco inline-block" />
              <span className="text-[var(--fg-muted)]">Recomendaciones</span>
            </span>
          {showNearby && (
            <span className="flex items-center gap-2">
              <span className="trip-marker trip-marker-osm inline-block" />
              <span className="text-[var(--fg-muted)]">Cercano (OSM)</span>
            </span>
          )}
        </div>
        <button
          onClick={toggleNearby}
          disabled={loading}
          className="btn-ghost text-xs"
        >
          {loading
            ? "Buscando lugares…"
            : showNearby
            ? "Ocultar lugares cercanos"
            : "Descubrir lugares cercanos"}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-[var(--accent)]">{error}</p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="h-[360px] overflow-hidden rounded-2xl border border-[var(--line)] sm:h-[480px] md:h-[560px]"
      >
        <TripMapClient
          center={center}
          itinerary={itinerary}
          recommendations={recommendations}
          nearbyPlaces={nearby}
          showNearby={showNearby}
        />
      </motion.div>

      {showNearby && nearby.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <p className="eyebrow mb-3">
            {nearby.length} lugares cercanos · datos de OpenStreetMap
          </p>
          <div className="flex flex-wrap gap-2">
            {nearby.slice(0, 18).map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs"
              >
                <span className="text-[var(--accent)]">{recoTypeLabel(p.type)}</span>
                <span className="mx-1.5 text-[var(--line)]">·</span>
                {p.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
