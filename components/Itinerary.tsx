"use client";

import { motion } from "framer-motion";
import { formatDate, googleMapsUrl } from "@/lib/utils";
import type { ItineraryDay, Trip } from "@/lib/schema";
import PdfButton from "./PdfButton";

export default function Itinerary({
  days,
  trip,
}: {
  days: ItineraryDay[];
  trip: Trip;
}) {
  if (!days.length) return null;

  return (
    <section id="itinerario" className="container-editorial py-16 md:py-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Itinerario día a día</h2>
        <div className="flex items-center gap-3">
          <PdfButton trip={trip} full />
          <span className="section-number">{days.length} días</span>
        </div>
      </div>
      <div className="rule mb-12" />

      <div className="space-y-16">
        {days.map((day, idx) => (
          <motion.div
            key={day.dayNumber}
            id={`dia-${day.dayNumber}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="scroll-mt-20"
          >
            <div className="mb-6 flex items-baseline gap-4 border-b border-[var(--line)] pb-4">
              <span className="font-display text-5xl leading-none tracking-tightest text-[var(--accent)]">
                {String(day.dayNumber).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <h3 className="font-display text-2xl leading-tight tracking-tightest md:text-3xl">
                  {day.title}
                </h3>
                <p className="mt-1 font-mono text-xs text-[var(--fg-muted)]">
                  {formatDate(day.date)}
                </p>
              </div>
              <PdfButton trip={trip} day={day} />
            </div>

            {day.summary && (
              <p className="mb-8 max-w-2xl text-base leading-relaxed text-[var(--fg-muted)] text-balance">
                {day.summary}
              </p>
            )}

            <ol className="relative space-y-1">
              {day.stops.map((stop, i) => {
                const mapsUrl = googleMapsUrl({
                  query: stop.location
                    ? `${stop.title}, ${stop.location}`
                    : stop.title,
                  lat: stop.coordinates?.lat,
                  lng: stop.coordinates?.lng,
                });

                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    className="group grid grid-cols-[auto_1fr] gap-4 border-l-2 border-[var(--line)] py-5 pl-5 transition-colors hover:border-[var(--accent)] md:grid-cols-[auto_1fr_auto] md:gap-6"
                  >
                    <div className="flex flex-col items-center">
                      {stop.time ? (
                        <span className="font-mono text-xs font-medium text-[var(--accent)]">
                          {stop.time}
                        </span>
                      ) : (
                        <span className="h-2 w-2 rounded-full border border-[var(--fg-muted)] group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)]" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h4 className="font-display text-lg tracking-tightest md:text-xl">
                          {stop.title}
                        </h4>
                        {stop.location && (
                          <span className="text-xs text-[var(--fg-muted)]">
                            {stop.location}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                        {stop.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {stop.duration && (
                          <span className="font-mono text-xs text-[var(--fg-muted)]">
                            {stop.duration}
                          </span>
                        )}
                        {stop.cost && (
                          <span className="font-mono text-xs text-[var(--fg-muted)]">
                            {stop.cost}
                          </span>
                        )}
                        {stop.tags?.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[var(--bg-alt)] px-2.5 py-0.5 text-xs text-[var(--fg-muted)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-end justify-end md:col-span-1">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        Maps
                      </a>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
