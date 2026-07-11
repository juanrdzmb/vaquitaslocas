"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { formatDate, googleDirectionsUrl, googleMapsUrl } from "@/lib/utils";
import { MapPinIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import type { ItineraryDay, Trip } from "@/lib/schema";
import PdfButton from "./PdfButton";
import CalendarButton from "./CalendarButton";

function stopKey(day: ItineraryDay, index: number): string {
  return day.stops[index]?.id || `day-${day.dayNumber}-stop-${index}`;
}

export default function Itinerary({ days, trip }: { days: ItineraryDay[]; trip: Trip }) {
  const [activeDay, setActiveDay] = useState(days[0]?.dayNumber ?? 1);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const storageKey = `vaquitas-progress:${trip.id}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(saved)) setCompleted(new Set(saved.filter((item): item is string => typeof item === "string")));
    } catch {
      // A corrupt local preference should never break the itinerary.
    }
  }, [storageKey]);

  useEffect(() => {
    const selectHashDay = () => {
      const match = /^#dia-(\d+)$/.exec(window.location.hash);
      if (match) setActiveDay(Number(match[1]));
    };
    selectHashDay();
    window.addEventListener("hashchange", selectHashDay);
    return () => window.removeEventListener("hashchange", selectHashDay);
  }, []);

  const active = days.find((day) => day.dayNumber === activeDay) ?? days[0];
  const totalStops = useMemo(() => days.reduce((sum, day) => sum + day.stops.length, 0), [days]);
  const completedCount = [...completed].filter((key) => days.some((day) => day.stops.some((_, index) => stopKey(day, index) === key))).length;

  if (!days.length || !active) return null;

  function toggle(key: string) {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <section id="itinerario" className="scroll-mt-24 py-14 md:py-20">
      <div className="container-editorial">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">El plan, sin pelear con quince pestañas</p>
            <h2 className="display-md">Día a día</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PdfButton trip={trip} full />
            <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
              {completedCount}/{totalStops} hechos
            </span>
          </div>
        </div>
      </div>

      <div className="sticky top-[4.5rem] z-30 mt-8 border-y border-[var(--line)] bg-[var(--bg)]/90 py-3 backdrop-blur-xl">
        <nav className="container-editorial flex gap-2 overflow-x-auto no-scrollbar" aria-label="Días del viaje">
          {days.map((day) => {
            const selected = day.dayNumber === active.dayNumber;
            const dayDone = day.stops.length > 0 && day.stops.every((_, index) => completed.has(stopKey(day, index)));
            return (
              <button
                key={day.dayNumber}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setActiveDay(day.dayNumber);
                  history.replaceState(null, "", `#dia-${day.dayNumber}`);
                }}
                className={`flex min-h-12 shrink-0 items-center gap-3 rounded-full border px-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${selected ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]" : "border-[var(--line)] bg-[var(--bg-alt)] hover:border-[var(--accent)]"}`}
              >
                <span className={`font-mono text-[10px] ${selected ? "text-[var(--bg)]" : "text-[var(--accent)]"}`}>{dayDone ? "✓" : String(day.dayNumber).padStart(2, "0")}</span>
                <span className="max-w-36 truncate text-xs font-medium">{day.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="container-editorial pt-10">
        <motion.div
          key={active.dayNumber}
          id={`dia-${active.dayNumber}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="scroll-mt-40"
        >
          <div className="grid gap-6 border-b border-[var(--line)] pb-7 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <span className="font-display text-6xl leading-none tracking-[-0.07em] text-[var(--accent)] sm:text-7xl">{String(active.dayNumber).padStart(2, "0")}</span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--fg-muted)]">{formatDate(active.date)}</p>
              <h3 className="mt-2 font-display text-3xl leading-none tracking-tightest sm:text-5xl">{active.title}</h3>
            </div>
            <PdfButton trip={trip} day={active} />
          </div>

          {active.summary && <p className="my-7 max-w-3xl text-base leading-relaxed text-[var(--fg-muted)] sm:text-lg">{active.summary}</p>}

          <ol className="grid gap-3">
            {active.stops.map((stop, index) => {
              const key = stopKey(active, index);
              const done = completed.has(key);
              const destination = stop.location
                ? `${stop.title}, ${stop.location}`
                : `${stop.title}, ${trip.destination}`;
              const placeUrl = googleMapsUrl({ query: destination, lat: stop.coordinates?.lat, lng: stop.coordinates?.lng });
              const directions = googleDirectionsUrl({ destination, lat: stop.coordinates?.lat, lng: stop.coordinates?.lng, travelMode: "walking" });
              return (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.18) }}
                  className={`group rounded-[1.5rem] border p-4 transition sm:p-5 ${done ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]"}`}
                >
                  <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-pressed={done}
                      aria-label={`${done ? "Marcar como pendiente" : "Marcar como hecho"}: ${stop.title}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--line)] text-[var(--fg-muted)] group-hover:border-[var(--accent)]"}`}
                    >
                      {done ? "✓" : String(index + 1).padStart(2, "0")}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {stop.time && <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 font-mono text-[10px] text-white">{stop.time}</span>}
                            {stop.duration && <span className="text-xs text-[var(--fg-muted)]">{stop.duration}</span>}
                            {stop.cost && <span className="text-xs text-[var(--fg-muted)]">{stop.cost}</span>}
                          </div>
                          <h4 className={`mt-3 font-display text-2xl leading-tight tracking-tightest ${done ? "line-through opacity-60" : ""}`}>{stop.title}</h4>
                          {stop.location && <p className="mt-1 text-xs text-[var(--accent)]">{stop.location}</p>}
                        </div>
                      </div>

                      {stop.description && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--fg-muted)] sm:text-base">{stop.description}</p>}
                      {stop.tags && stop.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">{stop.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--bg-alt)] px-3 py-1 text-[11px] text-[var(--fg-muted)]">{tag}</span>)}</div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 px-4 py-2.5 text-xs">
                          <MapPinIcon size={16} weight="duotone" aria-hidden /> Ver lugar
                        </a>
                        <a href={directions} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-4 py-2.5 text-xs">
                          <NavigationArrowIcon size={16} weight="duotone" aria-hidden /> Cómo llegar
                        </a>
                        <CalendarButton event={{ title: stop.title, date: active.date, startTime: stop.time, location: stop.location, description: stop.description }} label="Añadir" />
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
