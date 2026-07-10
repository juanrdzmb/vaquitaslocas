"use client";

import { motion } from "framer-motion";
import type { TransportSegment } from "@/lib/schema";
import { formatDate, formatCurrency, googleMapsUrl } from "@/lib/utils";

const TYPE_META: Record<
  TransportSegment["type"],
  { label: string; icon: string }
> = {
  flight: { label: "Vuelo", icon: "✈" },
  train: { label: "Tren", icon: "🚆" },
  bus: { label: "Bus", icon: "🚌" },
  other: { label: "Transporte", icon: "→" },
};

export default function FlightsTrains({
  segments,
}: {
  segments: TransportSegment[];
}) {
  if (!segments.length) return null;

  const total = segments.reduce((sum, s) => sum + (s.price ?? 0), 0);
  const currency = segments[0]?.currency ?? "EUR";

  return (
    <section className="container-editorial py-16 md:py-24">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Vuelos y trenes</h2>
        <span className="section-number">Transporte</span>
      </div>
      <div className="rule mb-12" />

      <div className="space-y-4">
        {segments.map((seg, i) => {
          const meta = TYPE_META[seg.type];
          const mapsUrl = googleMapsUrl({
            query: `${seg.departure} to ${seg.arrival}`,
            lat: seg.coordinates?.lat,
            lng: seg.coordinates?.lng,
          });
          return (
            <motion.div
              key={seg.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group grid grid-cols-1 gap-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 transition-colors hover:bg-[var(--bg-alt)] sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-xl">
                  {meta.icon}
                </span>
                <div>
                  <span className="section-number">{meta.label}</span>
                  {seg.date && (
                    <p className="font-mono text-xs text-[var(--fg-muted)]">
                      {formatDate(seg.date)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-6">
                <div className="text-center">
                  <p className="font-display text-lg leading-none tracking-tightest">
                    {seg.departure}
                  </p>
                  {seg.departureTime && (
                    <p className="mt-1 font-mono text-xs text-[var(--fg-muted)]">
                      {seg.departureTime}
                    </p>
                  )}
                </div>

                <div className="flex flex-1 flex-col items-center">
                  <span className="font-mono text-xs text-[var(--accent)]">
                    {seg.duration ?? ""}
                  </span>
                  <div className="my-1 h-px w-full bg-[var(--line)]">
                    <span className="block h-full w-full origin-left animate-draw-line bg-[var(--accent)]" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest2 text-[var(--fg-muted)]">
                    {meta.label.toLowerCase()}
                  </span>
                </div>

                <div className="text-center">
                  <p className="font-display text-lg leading-none tracking-tightest">
                    {seg.arrival}
                  </p>
                  {seg.arrivalTime && (
                    <p className="mt-1 font-mono text-xs text-[var(--fg-muted)]">
                      {seg.arrivalTime}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                {seg.price != null && (
                  <span className="font-mono text-sm">
                    {formatCurrency(seg.price, seg.currency)}
                  </span>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-xs transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  aria-label="Ver ruta en Google Maps"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </a>
              </div>

              {seg.notes && (
                <p className="col-span-full text-xs italic text-[var(--fg-muted)]">
                  {seg.notes}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-6 flex items-center justify-between border-t-2 border-[var(--fg)] pt-4">
          <span className="font-display text-lg">Total transporte</span>
          <span className="font-display text-2xl">
            {formatCurrency(total, currency)}
          </span>
        </div>
      )}
    </section>
  );
}
