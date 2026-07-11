"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Trip } from "@/lib/schema";
import { formatDateRange } from "@/lib/utils";

function hasMapPoints(trip: Trip): boolean {
  if (trip.mapCenter) return true;
  if (trip.itinerary.some((day) => day.stops.some((stop) => stop.coordinates))) {
    return true;
  }
  return trip.recommendations.some((recommendation) => recommendation.coordinates);
}

function coordinateLabel(trip: Trip): string {
  if (!trip.mapCenter) return "Edición de viaje";
  const { lat, lng } = trip.mapCenter;
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(
    lng
  ).toFixed(2)}° ${lng >= 0 ? "E" : "O"}`;
}

export default function TripHero({ trip }: { trip: Trip }) {
  const reduceMotion = useReducedMotion();
  const hasMap = hasMapPoints(trip);
  const heroInitial = reduceMotion ? false : { opacity: 0, y: 18 };
  const primaryTarget = trip.itinerary.length
    ? "#itinerario"
    : hasMap
      ? "#mapa"
      : trip.recommendations.length
        ? "#recomendaciones"
        : "#trip-top";
  const primaryLabel = trip.itinerary.length
    ? "Explorar los días"
    : hasMap
      ? "Explorar el mapa"
      : trip.recommendations.length
        ? "Ver recomendaciones"
        : "Tu viaje, a mano";

  return (
    <header id="trip-top" className="trip-hero">
      <div className="trip-hero__orb" aria-hidden="true" />
      <div className="trip-hero__route" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container-editorial trip-hero__container">
        <motion.div
          initial={heroInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="trip-hero__grid"
        >
          <div className="trip-hero__copy">
            <div className="trip-hero__meta">
              <span className="trip-edition-pill">
                <span aria-hidden="true">✦</span>
                Edición {trip.destination}
              </span>
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
            </div>

            <p className="trip-hero__destination">{trip.destination}</p>
            <h1
              id="trip-title"
              className={`trip-hero__title ${trip.title.length > 58 ? "trip-hero__title--long" : ""}`}
            >
              {trip.title}
            </h1>

            {trip.subtitle && (
              <p className="trip-hero__subtitle">{trip.subtitle}</p>
            )}

            <div className="trip-action-row" aria-label="Acciones del viaje">
              <a href={primaryTarget} className="btn-primary">
                {primaryLabel}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              {hasMap && (
                <a href="#mapa" className="btn-ghost">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
                    <path d="M9 3v15M15 6v15" />
                  </svg>
                  Mapa
                </a>
              )}
              {trip.recommendations.length > 0 && (
                <a href="#recomendaciones" className="btn-ghost">
                  Ideas para Amanda
                </a>
              )}
            </div>
          </div>

          <aside className="trip-passport" aria-label="Resumen del viaje">
            <div className="trip-passport__topline">
              <span>VL / {coordinateLabel(trip)}</span>
              <span aria-hidden="true">↗</span>
            </div>

            <div className="trip-passport__stats">
              <div>
                <span>Días</span>
                <strong>{String(trip.itinerary.length || 0).padStart(2, "0")}</strong>
              </div>
              <div>
                <span>{trip.travelers === 1 ? "Viajera" : "Viajeros"}</span>
                <strong>{String(Math.max(trip.travelers || 1, 1)).padStart(2, "0")}</strong>
              </div>
            </div>

            {trip.overview && <p className="trip-passport__overview">{trip.overview}</p>}

            {trip.highlights.length > 0 && (
              <ul className="trip-passport__highlights" aria-label="Momentos destacados">
                {trip.highlights.slice(0, 4).map((highlight, index) => (
                  <li key={`${highlight}-${index}`}>{highlight}</li>
                ))}
              </ul>
            )}
          </aside>
        </motion.div>

        {trip.itinerary.length > 0 && (
          <motion.nav
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.25, duration: reduceMotion ? 0 : 0.6 }}
            className="trip-day-rail no-scrollbar"
            aria-label="Saltar a un día del itinerario"
          >
            {trip.itinerary.map((day) => (
              <a key={day.dayNumber} href={`#dia-${day.dayNumber}`}>
                <span>{String(day.dayNumber).padStart(2, "0")}</span>
                <strong>{day.title}</strong>
              </a>
            ))}
          </motion.nav>
        )}
      </div>
    </header>
  );
}
