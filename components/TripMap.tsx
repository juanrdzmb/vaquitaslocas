"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  Coordinates,
  ItineraryDay,
  Recommendation,
} from "@/lib/schema";
import {
  recoTypeEmoji,
  recoTypeLabel,
} from "@/lib/schema";
import type { NearbyPlace } from "@/lib/maps";
import { googleMapsUrl } from "@/lib/utils";
import { TRIP_CHAPTER_EVENT } from "@/lib/trip-chapters";

type Props = {
  center: Coordinates | null;
  itinerary: ItineraryDay[];
  recommendations: Recommendation[];
  nearbyPlaces?: NearbyPlace[];
  showNearby?: boolean;
  userPosition?: Coordinates | null;
};

function escapeMarkerText(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character
  );
}

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

function makeIcon(className: string, glyph: string) {
  return L.divIcon({
    className: "leaflet-custom-icon",
    html: `<div class="${className}" style="display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-family:var(--font-geist-sans);">${escapeMarkerText(glyph)}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [points, map]);
  return null;
}

function RefreshMapWhenChapterOpens() {
  const map = useMap();
  useEffect(() => {
    const refresh = () => {
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };
    window.addEventListener(TRIP_CHAPTER_EVENT, refresh);
    return () => window.removeEventListener(TRIP_CHAPTER_EVENT, refresh);
  }, [map]);
  return null;
}

export default function TripMap({
  center,
  itinerary,
  recommendations,
  nearbyPlaces = [],
  showNearby = false,
  userPosition = null,
}: Props) {
  const allPoints = useMemo(() => {
    const pts: Coordinates[] = [];
    if (isValidCoordinates(center)) pts.push(center);
    for (const day of itinerary) {
      for (const s of day.stops) {
        if (isValidCoordinates(s.coordinates)) pts.push(s.coordinates);
      }
    }
    for (const r of recommendations) {
      if (isValidCoordinates(r.coordinates)) pts.push(r.coordinates);
    }
    if (showNearby) {
      for (const p of nearbyPlaces) {
        if (isValidCoordinates(p.coordinates)) pts.push(p.coordinates);
      }
    }
    if (isValidCoordinates(userPosition)) pts.push(userPosition);
    return pts;
  }, [
    center,
    itinerary,
    recommendations,
    nearbyPlaces,
    showNearby,
    userPosition,
  ]);

  const visibleBoundsPoints = useMemo(() => {
    if (!isValidCoordinates(userPosition)) return allPoints;
    const localPoints: Coordinates[] = [userPosition];
    if (showNearby) {
      for (const place of nearbyPlaces) {
        if (isValidCoordinates(place.coordinates)) {
          localPoints.push(place.coordinates);
        }
      }
    }
    return localPoints;
  }, [allPoints, nearbyPlaces, showNearby, userPosition]);

  if (!allPoints.length) {
    return (
      <div
        role="status"
        className="flex h-full w-full items-center justify-center bg-[var(--bg-alt)] px-6 text-center text-sm text-[var(--fg-muted)]"
      >
        No hay coordenadas disponibles para mostrar este viaje.
      </div>
    );
  }

  const initialCenter = isValidCoordinates(userPosition)
    ? userPosition
    : isValidCoordinates(center)
      ? center
      : allPoints[0];

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
      aria-label="Mapa interactivo del viaje"
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <FitBounds points={visibleBoundsPoints} />
      <RefreshMapWhenChapterOpens />

      {itinerary.map((day) =>
        day.stops.map((stop, i) =>
          isValidCoordinates(stop.coordinates) ? (
            <Marker
              key={`d${day.dayNumber}-${i}`}
              position={[stop.coordinates.lat, stop.coordinates.lng]}
              icon={makeIcon("trip-marker trip-marker-day", String(day.dayNumber))}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <div className="section-number">Día {day.dayNumber}</div>
                  <div className="font-display text-base">{stop.title}</div>
                  {stop.time && (
                    <div className="text-xs text-[var(--fg-muted)]">{stop.time}</div>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
                    {stop.description}
                  </p>
                  <a
                    href={googleMapsUrl({
                      query: stop.location ? `${stop.title}, ${stop.location}` : stop.title,
                      lat: stop.coordinates?.lat,
                      lng: stop.coordinates?.lng,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Abrir en Google Maps →
                  </a>
                </div>
              </Popup>
            </Marker>
          ) : null
        )
      )}

      {recommendations.map((r) =>
        isValidCoordinates(r.coordinates) ? (
          <Marker
            key={r.id}
            position={[r.coordinates.lat, r.coordinates.lng]}
            icon={makeIcon(
              "trip-marker trip-marker-reco",
              recoTypeEmoji(r.type) || "•"
            )}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="section-number">
                  {recoTypeLabel(r.type) || "Recomendación"}
                </div>
                <div className="font-display text-base">{r.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">
                  {r.description}
                </p>
                {r.reason && (
                  <p className="mt-2 border-t border-[var(--line)] pt-2 text-xs italic text-[var(--fg)]">
                    {r.reason}
                  </p>
                )}
                <a
                  href={googleMapsUrl({
                    query: r.location ? `${r.title}, ${r.location}` : r.title,
                    lat: r.coordinates?.lat,
                    lng: r.coordinates?.lng,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Abrir en Google Maps →
                </a>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}

      {showNearby &&
        nearbyPlaces.map((p) =>
          isValidCoordinates(p.coordinates) ? (
            <Marker
              key={p.id}
              position={[p.coordinates.lat, p.coordinates.lng]}
              icon={makeIcon(
                "trip-marker trip-marker-osm",
                recoTypeEmoji(p.type)
              )}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <div className="section-number">{p.category}</div>
                  <div className="font-display text-sm">{p.name}</div>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

      {isValidCoordinates(userPosition) && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={makeIcon("trip-marker !bg-sky-600", "●")}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="min-w-[130px]">
              <div className="font-display text-sm">Tu posición</div>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Solo se usa durante esta visita.
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
