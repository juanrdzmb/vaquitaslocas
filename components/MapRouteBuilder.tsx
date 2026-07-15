"use client";

import { useMemo, useState } from "react";
import type { ItineraryDay, Recommendation } from "@/lib/schema";
import type { NearbyPlace } from "@/lib/maps";
import {
  GOOGLE_MAPS_ROUTE_MAX_STOPS,
  googleMapsUrl,
  googleMultiStopDirectionsUrl,
  type GoogleMapsPoint,
} from "@/lib/utils";

type Props = {
  itinerary: ItineraryDay[];
  recommendations: Recommendation[];
  nearbyPlaces?: NearbyPlace[];
  destination: string;
};

type RouteMode = "walking" | "driving" | "bicycling";

type RouteCandidate = GoogleMapsPoint & {
  id: string;
  title: string;
  context: string;
};

const ROUTE_MODES: Array<{ value: RouteMode; label: string }> = [
  { value: "walking", label: "A pie" },
  { value: "driving", label: "En coche" },
  { value: "bicycling", label: "En bici" },
];

function candidateSignature(candidate: RouteCandidate): string {
  if (
    typeof candidate.lat === "number" &&
    Number.isFinite(candidate.lat) &&
    typeof candidate.lng === "number" &&
    Number.isFinite(candidate.lng)
  ) {
    return `${candidate.lat.toFixed(5)},${candidate.lng.toFixed(5)}`;
  }
  return (candidate.query ?? candidate.title).trim().toLocaleLowerCase("es");
}

function buildCandidates(
  itinerary: ItineraryDay[],
  recommendations: Recommendation[],
  nearbyPlaces: NearbyPlace[],
  destination: string
): RouteCandidate[] {
  const candidates: RouteCandidate[] = [];
  const seen = new Set<string>();

  function add(candidate: RouteCandidate) {
    if (!candidate.title.trim()) return;
    const signature = candidateSignature(candidate);
    if (!signature || seen.has(signature)) return;
    seen.add(signature);
    candidates.push(candidate);
  }

  for (const day of itinerary) {
    day.stops.forEach((stop, index) => {
      add({
        id: `day-${day.dayNumber}-${stop.id ?? index}`,
        title: stop.title,
        context: `Día ${day.dayNumber}${stop.time ? ` · ${stop.time}` : ""}`,
        query: stop.location
          ? `${stop.title}, ${stop.location}`
          : `${stop.title}, ${destination}`,
        lat: stop.coordinates?.lat,
        lng: stop.coordinates?.lng,
      });
    });
  }

  for (const recommendation of recommendations) {
    add({
      id: `recommendation-${recommendation.id}`,
      title: recommendation.title,
      context: recommendation.location || "Recomendación",
      query: recommendation.location
        ? `${recommendation.title}, ${recommendation.location}`
        : `${recommendation.title}, ${destination}`,
      lat: recommendation.coordinates?.lat,
      lng: recommendation.coordinates?.lng,
    });
  }

  for (const place of nearbyPlaces) {
    add({
      id: `nearby-${place.id}`,
      title: place.name,
      context: `${place.category} · cerca del mapa`,
      query: `${place.name}, ${destination}`,
      lat: place.coordinates.lat,
      lng: place.coordinates.lng,
    });
  }

  return candidates;
}

export default function MapRouteBuilder({
  itinerary,
  recommendations,
  nearbyPlaces = [],
  destination,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<RouteMode>("walking");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const candidates = useMemo(
    () => buildCandidates(itinerary, recommendations, nearbyPlaces, destination),
    [destination, itinerary, nearbyPlaces, recommendations]
  );
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates]
  );
  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => candidateById.get(id))
        .filter((candidate): candidate is RouteCandidate => Boolean(candidate)),
    [candidateById, selectedIds]
  );
  const visibleCandidates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return candidates;
    return candidates.filter((candidate) =>
      `${candidate.title} ${candidate.context}`
        .toLocaleLowerCase("es")
        .includes(query)
    );
  }, [candidates, search]);
  const routeUrl = useMemo(
    () =>
      googleMultiStopDirectionsUrl({
        stops: selected,
        travelMode: mode,
      }),
    [mode, selected]
  );

  function toggleCandidate(candidate: RouteCandidate) {
    setNotice("");
    setSelectedIds((current) => {
      const validCurrent = current.filter((id) => candidateById.has(id));
      if (validCurrent.includes(candidate.id)) {
        return validCurrent.filter((id) => id !== candidate.id);
      }
      if (validCurrent.length >= GOOGLE_MAPS_ROUTE_MAX_STOPS) {
        setNotice(
          `Google Maps admite tres paradas intermedias de forma fiable en móvil. Quita una para añadir ${candidate.title}.`
        );
        return validCurrent;
      }
      return [...validCurrent, candidate.id];
    });
  }

  function moveCandidate(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;
    const reordered = selected.map((candidate) => candidate.id);
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];
    setSelectedIds(reordered);
  }

  if (candidates.length < 2) return null;

  return (
    <div
      id="route-builder"
      className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)]"
    >
      <div className="border-b border-[var(--line)] p-5 sm:p-6">
        <p className="eyebrow mb-2">Ruta a tu manera</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-display text-2xl tracking-tightest sm:text-3xl">
              Junta varios lugares en un solo recorrido
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              El primero será la salida y el último la llegada. Así puedes mirar
              la ruta antes del viaje sin que Maps decida empezar desde tu sofá.
            </p>
          </div>
          <label className="flex min-h-12 shrink-0 items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--bg-alt)] px-4 text-xs">
            <span className="text-[var(--fg-muted)]">Moverse</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as RouteMode)}
              className="min-h-11 bg-transparent font-medium outline-none"
              aria-label="Medio de transporte para la ruta"
            >
              {ROUTE_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="border-b border-[var(--line)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <label htmlFor="route-place-search" className="sr-only">
            Buscar un lugar para la ruta
          </label>
          <input
            id="route-place-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar entre las paradas…"
            className="min-h-11 w-full rounded-full border border-[var(--line)] bg-[var(--bg-alt)] px-4 text-sm outline-none transition placeholder:text-[var(--fg-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
          />

          <div
            className="mt-3 max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain pr-1"
            role="group"
            aria-label="Lugares disponibles para la ruta"
          >
            {visibleCandidates.map((candidate) => {
              const checked = selected.some((item) => item.id === candidate.id);
              const limitReached =
                !checked && selected.length >= GOOGLE_MAPS_ROUTE_MAX_STOPS;
              return (
                <div
                  key={candidate.id}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2 transition ${
                    checked
                      ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
                      : "border-[var(--line)] bg-[var(--bg)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleCandidate(candidate)}
                    disabled={limitReached}
                    aria-pressed={checked}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      aria-hidden
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm ${
                        checked
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "border-[var(--line)]"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {candidate.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--fg-muted)]">
                        {candidate.context}
                      </span>
                    </span>
                  </button>
                  <a
                    href={googleMapsUrl({ ...candidate, preferCoordinates: true })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--bg-alt)] hover:underline"
                    aria-label={`Ver ${candidate.title} en Google Maps`}
                  >
                    Ver lugar ↗
                  </a>
                </div>
              );
            })}
            {visibleCandidates.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-[var(--fg-muted)]">
                Ese lugar no aparece en el plan.
              </p>
            )}
          </div>
        </div>

        <div className="flex min-h-72 flex-col bg-[var(--bg-alt)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">Orden de la ruta</h4>
            <span className="font-mono text-[10px] text-[var(--fg-muted)]">
              {selected.length}/{GOOGLE_MAPS_ROUTE_MAX_STOPS}
            </span>
          </div>

          {selected.length ? (
            <ol className="mt-3 space-y-2">
              {selected.map((candidate, index) => (
                <li
                  key={candidate.id}
                  className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--fg)] font-mono text-[10px] text-[var(--bg)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {candidate.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveCandidate(index, -1)}
                    disabled={index === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm hover:bg-[var(--bg-alt)] disabled:opacity-25"
                    aria-label={`Subir ${candidate.title}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCandidate(index, 1)}
                    disabled={index === selected.length - 1}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm hover:bg-[var(--bg-alt)] disabled:opacity-25"
                    aria-label={`Bajar ${candidate.title}`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCandidate(candidate)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-[var(--fg-muted)] hover:bg-[var(--bg-alt)] hover:text-[var(--accent)]"
                    aria-label={`Quitar ${candidate.title} de la ruta`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm leading-relaxed text-[var(--fg-muted)]">
              Elige al menos dos sitios. El orden en que los marques será el
              orden del paseo.
            </div>
          )}

          <p className="mt-auto pt-4 text-xs text-[var(--fg-muted)]" aria-live="polite">
            {notice ||
              (selected.length === 1
                ? "Falta un lugar para poder dibujar la ruta."
                : selected.length >= 2
                  ? `${selected[0].title} → ${selected[selected.length - 1].title}`
                  : "Hasta cinco lugares para que también funcione bien en móvil.")}
          </p>

          {routeUrl ? (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-3 min-h-12 w-full justify-center px-5 py-3 text-center text-xs"
            >
              Abrir ruta completa en Google Maps ↗
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-3 min-h-12 w-full cursor-not-allowed rounded-full bg-[var(--fg)] px-5 text-xs font-medium text-[var(--bg)] opacity-35"
            >
              Selecciona dos lugares
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
