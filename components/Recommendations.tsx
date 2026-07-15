"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Recommendation } from "@/lib/schema";
import { recoTypeLabel } from "@/lib/schema";
import { googleDirectionsUrl, googleMapsUrl } from "@/lib/utils";
import {
  BarbellIcon,
  BinocularsIcon,
  BookOpenTextIcon,
  BooksIcon,
  CompassRoseIcon,
  ForkKnifeIcon,
  PaletteIcon,
  PushPinIcon,
  MapPinIcon,
  NavigationArrowIcon,
  SealCheckIcon,
  WarningCircleIcon,
  LightbulbFilamentIcon,
} from "@phosphor-icons/react";

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

function RecommendationIcon({ type }: { type: Recommendation["type"] }) {
  const props = { size: 25, weight: "duotone" as const, "aria-hidden": true };
  if (type === "restaurant") return <ForkKnifeIcon {...props} />;
  if (type === "library") return <BooksIcon {...props} />;
  if (type === "bookstore") return <BookOpenTextIcon {...props} />;
  if (type === "activity") return <BarbellIcon {...props} />;
  if (type === "viewpoint") return <BinocularsIcon {...props} />;
  if (type === "culture") return <PaletteIcon {...props} />;
  if (type === "hidden_gem") return <CompassRoseIcon {...props} />;
  return <PushPinIcon {...props} />;
}

export default function Recommendations({
  recommendations,
  destination,
  sectionId = "recomendaciones",
}: {
  recommendations: Recommendation[];
  destination: string;
  sectionId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => recommendations.filter((item) => matches(item, filter)), [filter, recommendations]);
  if (!recommendations.length) return null;

  return (
    <section id={sectionId} className="container-editorial scroll-mt-24 py-14 md:py-20">
      <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Ideas nuevas de Juan · fuera del plan original</p>
          <h2 className="display-md">Por si te apetece añadir algo</h2>
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--fg-muted)] lg:justify-self-end">
          Te dejé opciones que encajan con lo que ya planeaste: comer sin negociar con una guarnición, caminar, leer y mover peso por voluntad propia. Yo no juzgo ese último trastorno. 🫶
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
            const placeQuery = item.location
              ? `${item.title}, ${item.location}`
              : `${item.title}, ${destination}`;
            const placeUrl = googleMapsUrl({
              query: placeQuery,
              lat: item.coordinates?.lat,
              lng: item.coordinates?.lng,
            });
            const directions = googleDirectionsUrl({
              destination: placeQuery,
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
                className="group flex flex-col rounded-[var(--shape-xl)] border border-[var(--outline-variant)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-alt)] text-[var(--accent)]" aria-hidden>
                    <RecommendationIcon type={item.type} />
                  </span>
                  <span className="kinetic-label">{recoTypeLabel(item.type)}</span>
                </div>
                <h3 className="mt-7 font-display text-3xl leading-[1.02] tracking-tightest">{item.title}</h3>
                {item.location && <p className="mt-2 text-xs text-[var(--accent)]">{item.location}</p>}
                <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">{item.description}</p>
                {item.reason && <p className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm italic leading-relaxed">{item.reason}</p>}
                <div className="mt-auto pt-6">
                  <div className="mb-4 flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                    {item.verificationStatus === "verified" ? (
                      <><SealCheckIcon size={17} weight="fill" className="text-emerald-600" aria-hidden /> Sitio contrastado en el mapa</>
                    ) : item.verificationStatus === "concept" ? (
                      <><LightbulbFilamentIcon size={17} weight="duotone" aria-hidden /> Idea de zona, no negocio inventado</>
                    ) : (
                      <><WarningCircleIcon size={17} weight="duotone" aria-hidden /> Confirma el sitio antes de ir</>
                    )}
                  </div>
                  {item.tags && item.tags.length > 0 && <div className="mb-4 flex flex-wrap gap-1.5">{item.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-[var(--bg-alt)] px-2.5 py-1 text-[10px] text-[var(--fg-muted)]">{tag}</span>)}</div>}
                  <div className={`recommendation-actions grid gap-2 ${item.verificationStatus === "verified" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] px-3 text-xs font-medium text-[var(--on-primary)] transition">
                      <MapPinIcon size={15} weight="duotone" aria-hidden /> {item.verificationStatus === "verified" ? "Ver sitio" : "Comprobar en Maps"}
                    </a>
                    {item.verificationStatus === "verified" && (
                      <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-medium transition hover:border-[var(--accent)]">
                        <NavigationArrowIcon size={15} weight="duotone" aria-hidden /> Cómo llegar
                      </a>
                    )}
                  </div>
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
