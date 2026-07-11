"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Recommendation } from "@/lib/schema";
import { recoTypeEmoji, recoTypeLabel } from "@/lib/schema";
import { googleDirectionsUrl } from "@/lib/utils";

type Filter = "all" | "vegetarian" | "books" | "movement" | "walk";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Todo ✦" },
  { key: "vegetarian", label: "Comer bien 🥬" },
  { key: "books", label: "Libros 📚" },
  { key: "movement", label: "Entrenar 🏋️" },
  { key: "walk", label: "Pasear 🚶" },
];

function matches(item: Recommendation, filter: Filter): boolean {
  if (filter === "all") return true;
  const haystack = `${item.title} ${item.description} ${item.reason} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  if (filter === "vegetarian") return item.type === "restaurant" && /veget|vegano|vegan|plant.?based|falafel|ensalada/.test(haystack);
  if (filter === "books") return item.type === "library" || item.type === "bookstore" || /libr|bibliot|book|lectur/.test(haystack);
  if (filter === "movement") return /entren|gimnas|gym|fitness|yoga|correr|running|workout/.test(haystack);
  return item.type === "viewpoint" || /paseo|caminar|walking|walk|parque|park|sender|ruta|barrio|mirador/.test(haystack);
}

export default function Recommendations({ recommendations }: { recommendations: Recommendation[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => recommendations.filter((item) => matches(item, filter)), [filter, recommendations]);
  if (!recommendations.length) return null;

  return (
    <section id="recomendaciones" className="container-editorial scroll-mt-24 py-14 md:py-20">
      <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Curado para Amanda, no para el algoritmo</p>
          <h2 className="display-md">Comer, leer, moverte y perderte un poquito</h2>
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--fg-muted)] lg:justify-self-end">
          Recomendaciones pensadas para una vegetariana que entra a una librería “cinco minutos” y sale cuando ya cambiaron el escaparate.
        </p>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="group" aria-label="Filtrar recomendaciones">
        {FILTERS.map((item) => {
          const count = recommendations.filter((recommendation) => matches(recommendation, item.key)).length;
          if (item.key !== "all" && count === 0) return null;
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.key)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${active ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--line)] bg-[var(--bg-alt)] hover:border-[var(--accent)]"}`}
            >
              {item.label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item, index) => {
            const directions = googleDirectionsUrl({
              destination: item.location ? `${item.title}, ${item.location}` : item.title,
              lat: item.coordinates?.lat,
              lng: item.coordinates?.lng,
              travelMode: "walking",
            });
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (index % 3) * 0.04 }}
                className="group flex min-h-[22rem] flex-col rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-alt)] text-xl text-[var(--accent)]" aria-hidden>{recoTypeEmoji(item.type)}</span>
                  <span className="rounded-full border border-[var(--line)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">{recoTypeLabel(item.type)}</span>
                </div>
                <h3 className="mt-7 font-display text-3xl leading-[1.02] tracking-tightest">{item.title}</h3>
                {item.location && <p className="mt-2 text-xs text-[var(--accent)]">{item.location}</p>}
                <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">{item.description}</p>
                {item.reason && <p className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm italic leading-relaxed">{item.reason}</p>}
                <div className="mt-auto pt-6">
                  {item.tags && item.tags.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{item.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-[var(--bg-alt)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{tag}</span>)}</div>}
                  <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--fg)] px-4 text-xs font-medium text-[var(--bg)] transition group-hover:bg-[var(--accent)] group-hover:text-white">Llévame con Maps ↗</a>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--fg-muted)]">
          No salió ninguna recomendación de este tipo. Juan deberá ponerse a trabajar de verdad.
        </div>
      )}
    </section>
  );
}
