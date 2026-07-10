"use client";

import { motion } from "framer-motion";
import type { Trip } from "@/lib/schema";
import { formatDateRange } from "@/lib/utils";

export default function TripHero({ trip }: { trip: Trip }) {
  return (
    <header className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[var(--accent)] opacity-[0.06] blur-3xl"
      />
      <div className="container-editorial pt-12 pb-10 md:pt-20 md:pb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="eyebrow">VaquitasLocas</span>
            <span className="h-3 w-px bg-[var(--line)]" />
            <span className="font-mono text-[var(--fg-muted)]">
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            {trip.travelers > 1 && (
              <>
                <span className="h-3 w-px bg-[var(--line)]" />
                <span className="font-mono text-[var(--fg-muted)]">
                  {trip.travelers} viajeros
                </span>
              </>
            )}
          </div>

          <h1 className="display-xl text-balance max-w-4xl">
            {trip.title}
          </h1>

          {trip.subtitle && (
            <p className="font-display text-xl italic text-[var(--fg-muted)] max-w-2xl">
              {trip.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="font-mono text-sm text-[var(--fg)]">
              {trip.destination}
            </span>
            {trip.highlights.slice(0, 3).map((h) => (
              <span
                key={h}
                className="rounded-full border border-[var(--line)] px-4 py-1.5 font-sans text-xs text-[var(--fg-muted)]"
              >
                {h}
              </span>
            ))}
          </div>

          {trip.overview && (
            <p className="max-w-2xl text-lg leading-relaxed text-[var(--fg)] text-balance pt-2">
              {trip.overview}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <a href="#itinerario" className="btn-primary">
              Ver itinerario
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a href="#mapa" className="btn-ghost">Mapa</a>
            <a href="#recomendaciones" className="btn-ghost">Recomendaciones</a>
          </div>

          {trip.itinerary.length > 0 && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap gap-2 pt-4"
            >
              {trip.itinerary.map((day) => (
                <a
                  key={day.dayNumber}
                  href={`#dia-${day.dayNumber}`}
                  className="group flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--accent)]"
                >
                  <span className="font-mono text-[var(--accent)]">
                    {String(day.dayNumber).padStart(2, "0")}
                  </span>
                  <span className="text-[var(--fg-muted)] group-hover:text-[var(--fg)]">
                    {day.title}
                  </span>
                </a>
              ))}
            </motion.nav>
          )}
        </motion.div>
      </div>
    </header>
  );
}
