"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import TripMapClient from "./TripMapClient";
import type { NearbyPlace } from "@/lib/maps";
import type {
  Coordinates,
  ItineraryDay,
  Recommendation,
} from "@/lib/schema";
import { recoTypeLabel } from "@/lib/schema";

type Props = {
  center: Coordinates | null;
  itinerary: ItineraryDay[];
  recommendations: Recommendation[];
  tripId: string;
};

type NearbySource = "trip" | "user";

type NearbyCacheEntry = {
  savedAt: number;
  places: NearbyPlace[];
};

const NEARBY_RADIUS = 1500;
const NEARBY_CACHE_TTL = 30 * 60 * 1000;
const RECOMMENDATION_TYPES = new Set<Recommendation["type"]>([
  "hidden_gem",
  "restaurant",
  "library",
  "bookstore",
  "activity",
  "viewpoint",
  "culture",
  "other",
]);

function isValidCoordinates(
  coordinates: Coordinates | null | undefined
): coordinates is Coordinates {
  return Boolean(
    coordinates &&
      Number.isFinite(coordinates.lat) &&
      Number.isFinite(coordinates.lng) &&
      Math.abs(coordinates.lat) <= 90 &&
      Math.abs(coordinates.lng) <= 180
  );
}

function isNearbyPlace(value: unknown): value is NearbyPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<NearbyPlace>;
  return Boolean(
    typeof place.id === "string" &&
      typeof place.name === "string" &&
      typeof place.category === "string" &&
      typeof place.type === "string" &&
      RECOMMENDATION_TYPES.has(place.type as Recommendation["type"]) &&
      isValidCoordinates(place.coordinates) &&
      Array.isArray(place.tags)
  );
}

function cacheKey(tripId: string, coordinates: Coordinates): string {
  return [
    "vaquitas-nearby-v1",
    encodeURIComponent(tripId),
    coordinates.lat.toFixed(4),
    coordinates.lng.toFixed(4),
    NEARBY_RADIUS,
  ].join(":");
}

function readNearbyCache(
  tripId: string,
  coordinates: Coordinates
): NearbyPlace[] | null {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(tripId, coordinates));
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<NearbyCacheEntry>;
    if (
      typeof cached.savedAt !== "number" ||
      Date.now() - cached.savedAt > NEARBY_CACHE_TTL ||
      !Array.isArray(cached.places) ||
      !cached.places.every(isNearbyPlace)
    ) {
      window.sessionStorage.removeItem(cacheKey(tripId, coordinates));
      return null;
    }
    return cached.places;
  } catch {
    return null;
  }
}

function writeNearbyCache(
  tripId: string,
  coordinates: Coordinates,
  places: NearbyPlace[]
): void {
  try {
    const value: NearbyCacheEntry = { savedAt: Date.now(), places };
    window.sessionStorage.setItem(
      cacheKey(tripId, coordinates),
      JSON.stringify(value)
    );
  } catch {
    // Storage may be unavailable in private browsing; the map still works.
  }
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === 1) {
    return "No diste permiso para usar tu ubicación. Puedes activarlo en los ajustes del navegador.";
  }
  if (error.code === 2) {
    return "No pudimos determinar tu ubicación actual.";
  }
  return "La ubicación tardó demasiado en responder. Inténtalo de nuevo.";
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "number"
  );
}

export default function MapSection({
  center,
  itinerary,
  recommendations,
  tripId,
}: Props) {
  const [showNearby, setShowNearby] = useState(false);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [nearbySource, setNearbySource] = useState<NearbySource | null>(null);
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripCoordinates = useMemo(() => {
    const points: Coordinates[] = [];
    if (isValidCoordinates(center)) points.push(center);
    for (const day of itinerary) {
      for (const stop of day.stops) {
        if (isValidCoordinates(stop.coordinates)) points.push(stop.coordinates);
      }
    }
    for (const recommendation of recommendations) {
      if (isValidCoordinates(recommendation.coordinates)) {
        points.push(recommendation.coordinates);
      }
    }
    return points;
  }, [center, itinerary, recommendations]);

  const tripSearchCenter = useMemo<Coordinates | null>(() => {
    if (isValidCoordinates(center)) return center;
    if (!tripCoordinates.length) return null;
    return {
      lat:
        tripCoordinates.reduce((sum, point) => sum + point.lat, 0) /
        tripCoordinates.length,
      lng:
        tripCoordinates.reduce((sum, point) => sum + point.lng, 0) /
        tripCoordinates.length,
    };
  }, [center, tripCoordinates]);

  const hasItineraryMarkers = itinerary.some((day) =>
    day.stops.some((stop) => isValidCoordinates(stop.coordinates))
  );
  const hasRecommendationMarkers = recommendations.some((recommendation) =>
    isValidCoordinates(recommendation.coordinates)
  );
  const isBusy = loading || locating;

  async function loadNearbyPlaces(
    coordinates: Coordinates,
    source: NearbySource,
    allowSessionCache: boolean
  ): Promise<void> {
    setLoading(true);
    setNearbySource(source);
    setShowNearby(false);
    setNearby([]);
    setError(null);
    try {
      const cached = allowSessionCache
        ? readNearbyCache(tripId, coordinates)
        : null;
      if (cached) {
        setNearby(cached);
        setNearbySource(source);
        setShowNearby(true);
        return;
      }

      const params = new URLSearchParams({
        lat: String(coordinates.lat),
        lng: String(coordinates.lng),
        radius: String(NEARBY_RADIUS),
      });
      const response = await fetch(`/api/places?${params.toString()}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar lugares cercanos.");
      }
      const raw: unknown = await response.json();
      if (!Array.isArray(raw)) {
        throw new Error("La respuesta de lugares cercanos no es válida.");
      }
      const places = raw.filter(isNearbyPlace);
      setNearby(places);
      setNearbySource(source);
      setShowNearby(true);
      if (allowSessionCache) {
        writeNearbyCache(tripId, coordinates, places);
      }
    } catch (caught) {
      if (source === "user") setUserPosition(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudieron cargar lugares cercanos."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleNearby(): Promise<void> {
    if (showNearby) {
      setShowNearby(false);
      if (nearbySource === "user") setUserPosition(null);
      return;
    }
    if (!tripSearchCenter) {
      setError("El viaje no tiene coordenadas para buscar cerca.");
      return;
    }
    setUserPosition(null);
    if (nearbySource === "trip") {
      setShowNearby(true);
      setError(null);
      return;
    }
    await loadNearbyPlaces(tripSearchCenter, "trip", true);
  }

  async function useCurrentLocation(): Promise<void> {
    if (!("geolocation" in navigator)) {
      setError("Este navegador no permite consultar la ubicación.");
      return;
    }

    setLocating(true);
    setError(null);
    try {
      if ("permissions" in navigator) {
        let permission: PermissionStatus | null = null;
        try {
          permission = await navigator.permissions.query({
            name: "geolocation",
          });
        } catch {
          // Some Safari versions expose Permissions API without geolocation.
        }
        if (permission?.state === "denied") {
          throw new Error(
            "La ubicación está bloqueada. Actívala en los ajustes del navegador para usar esta opción."
          );
        }
      }

      const coordinates = await new Promise<Coordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10_000,
            maximumAge: 60_000,
          }
        );
      });

      if (!isValidCoordinates(coordinates)) {
        throw new Error("El navegador devolvió una ubicación no válida.");
      }
      setUserPosition(coordinates);
      await loadNearbyPlaces(coordinates, "user", false);
    } catch (caught) {
      setUserPosition(null);
      setError(
        isGeolocationError(caught)
          ? geolocationErrorMessage(caught)
          : caught instanceof Error
            ? caught.message
            : "No pudimos consultar tu ubicación."
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <section id="mapa" className="container-editorial py-16 md:py-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">El viaje en el mapa</h2>
        <span className="section-number">03</span>
      </div>
      <div className="rule mb-10" />

      {!tripSearchCenter ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          role="status"
          className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-alt)] px-6 text-center"
        >
          <svg
            aria-hidden="true"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-5 text-[var(--accent)]"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <h3 className="font-display text-2xl tracking-tightest">
            Aún no hay puntos para dibujar
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fg-muted)]">
            El Excel no incluía ubicaciones geolocalizables. Cuando una parada o
            recomendación tenga coordenadas, aparecerá aquí sin inventar un
            destino por defecto.
          </p>
        </motion.div>
      ) : (
        <>
          <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-4 text-xs">
              {hasItineraryMarkers && (
                <span className="flex items-center gap-2">
                  <span className="trip-marker trip-marker-day inline-block" />
                  <span className="text-[var(--fg-muted)]">
                    Paradas del itinerario
                  </span>
                </span>
              )}
              {hasRecommendationMarkers && (
                <span className="flex items-center gap-2">
                  <span className="trip-marker trip-marker-reco inline-block" />
                  <span className="text-[var(--fg-muted)]">Recomendaciones</span>
                </span>
              )}
              {showNearby && (
                <span className="flex items-center gap-2">
                  <span className="trip-marker trip-marker-osm inline-block" />
                  <span className="text-[var(--fg-muted)]">
                    {nearbySource === "user" ? "Cerca de ti" : "Cercano (OSM)"}
                  </span>
                </span>
              )}
              {userPosition && (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-600 shadow" />
                  <span className="text-[var(--fg-muted)]">Tu posición</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={toggleNearby}
                disabled={isBusy}
                aria-pressed={showNearby}
                aria-controls="trip-map-panel nearby-results"
                className="btn-ghost min-h-[44px] text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && nearbySource !== "user"
                  ? "Buscando lugares…"
                  : showNearby
                    ? "Ocultar lugares cercanos"
                    : "Descubrir cerca del viaje"}
              </button>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={isBusy}
                aria-describedby="location-privacy-note"
                className="btn-ghost min-h-[44px] text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {locating
                  ? "Pidiendo ubicación…"
                  : loading && nearbySource === "user"
                    ? "Buscando cerca de ti…"
                    : "Usar mi ubicación"}
              </button>
            </div>
          </div>

          <p
            id="location-privacy-note"
            className="mb-4 text-xs text-[var(--fg-muted)]"
          >
            Tu ubicación solo se solicita al tocar el botón y se conserva en
            memoria mientras esta página esté abierta; no se guarda.
          </p>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-alt)] px-4 py-3 text-sm text-[var(--accent)]"
            >
              {error}
            </p>
          )}

          <motion.div
            id="trip-map-panel"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            aria-busy={isBusy}
            className="h-[360px] overflow-hidden rounded-2xl border border-[var(--line)] sm:h-[480px] md:h-[560px]"
          >
            <TripMapClient
              center={center}
              itinerary={itinerary}
              recommendations={recommendations}
              nearbyPlaces={nearby}
              showNearby={showNearby}
              userPosition={userPosition}
            />
          </motion.div>

          {showNearby && (
            <motion.div
              id="nearby-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              {nearby.length > 0 ? (
                <>
                  <p className="eyebrow mb-3">
                    {nearby.length} lugares cercanos · datos de OpenStreetMap
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nearby.slice(0, 18).map((place) => (
                      <span
                        key={place.id}
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs"
                      >
                        <span className="text-[var(--accent)]">
                          {recoTypeLabel(place.type)}
                        </span>
                        <span className="mx-1.5 text-[var(--line)]">·</span>
                        {place.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p role="status" className="text-sm text-[var(--fg-muted)]">
                  No encontramos librerías, restaurantes ni puntos de interés
                  en un radio de 1,5 km.
                </p>
              )}
            </motion.div>
          )}
        </>
      )}
    </section>
  );
}
