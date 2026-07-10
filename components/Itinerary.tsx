"use client";

import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import type { ItineraryDay } from "@/lib/schema";

export default function Itinerary({ days }: { days: ItineraryDay[] }) {
  if (!days.length) return null;

  return (
    <section id="itinerario" className="container-editorial py-16 md:py-24">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Itinerario</h2>
        <span className="section-number">01 / {days.length} días</span>
      </div>
      <div className="rule mb-12" />

      <div className="space-y-20">
        {days.map((day, idx) => (
          <motion.div
            key={day.dayNumber}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
            className="grid grid-cols-1 gap-8 md:grid-cols-12"
          >
            <div className="md:col-span-3">
              <div className="space-y-2 md:sticky md:top-24">
                <p className="section-number">Día {day.dayNumber}</p>
                <h3 className="font-display text-3xl leading-tight tracking-tightest">
                  {day.title}
                </h3>
                <p className="font-mono text-xs text-[var(--fg-muted)]">
                  {formatDate(day.date)}
                </p>
              </div>
            </div>

            <div className="md:col-span-9">
              {day.summary && (
                <p className="mb-8 max-w-2xl text-base leading-relaxed text-[var(--fg-muted)] text-balance">
                  {day.summary}
                </p>
              )}

              <ol className="relative space-y-px">
                {day.stops.map((stop, i) => (
                  <li
                    key={i}
                    className="group grid grid-cols-[auto_1fr] gap-6 border-t border-[var(--line)] py-6 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs text-[var(--accent)]">
                        {stop.time || "·"}
                      </span>
                      <span className="mt-2 h-2 w-2 rounded-full border border-[var(--fg-muted)] group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-colors" />
                    </div>
                    <div className="space-y-2 pb-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h4 className="font-display text-xl tracking-tightest">
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
                      <div className="flex flex-wrap gap-2 pt-1">
                        {stop.duration && (
                          <span className="font-mono text-xs text-[var(--fg-muted)]">
                            ⏱ {stop.duration}
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
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
