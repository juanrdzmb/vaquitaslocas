"use client";

import { motion } from "framer-motion";
import type { Recommendation } from "@/lib/schema";
import { recoTypeEmoji, recoTypeLabel } from "@/lib/schema";
import { googleMapsUrl } from "@/lib/utils";

export default function Recommendations({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (!recommendations.length) return null;

  return (
    <section
      id="recomendaciones"
      className="container-editorial py-16 md:py-24"
    >
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Para no perderte nada</h2>
        <span className="section-number">04</span>
      </div>
      <p className="mb-12 max-w-xl font-display text-lg italic text-[var(--fg-muted)]">
        Joyas ocultas, librerías con encanto y mesas donde el local come de
        verdad — te las dejé anotadas para que las tengas a mano.
      </p>
      <div className="rule mb-12" />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
        {recommendations.map((r, i) => {
          const mapsUrl = googleMapsUrl({
            query: r.location
              ? `${r.title}, ${r.location}`
              : r.title,
            lat: r.coordinates?.lat,
            lng: r.coordinates?.lng,
          });

          return (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: (i % 2) * 0.05 }}
              className="group relative flex gap-5 bg-[var(--bg)] p-7 transition-colors hover:bg-[var(--bg-alt)]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] font-mono text-lg text-[var(--accent)]">
                {recoTypeEmoji(r.type)}
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="section-number">{recoTypeLabel(r.type)}</span>
                  {r.location && (
                    <span className="text-xs text-[var(--fg-muted)]">
                      {r.location}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl leading-tight tracking-tightest">
                  {r.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                  {r.description}
                </p>
                {r.reason && (
                  <p className="border-l-2 border-[var(--accent)] pl-3 pt-1 text-sm italic text-[var(--fg)]">
                    {r.reason}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2">
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
                    Ver en Google Maps
                  </a>
                  {r.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[var(--bg-alt)] px-2 py-0.5 text-xs text-[var(--fg-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
