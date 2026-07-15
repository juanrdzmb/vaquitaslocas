import type { ReactNode } from "react";
import Link from "next/link";
import type { Trip } from "@/lib/schema";
import ShareButton from "@/components/ShareButton";
import ThemeToggle from "@/components/ThemeToggle";
import MobileTripDock from "@/components/MobileTripDock";

function hasMapPoints(trip: Trip): boolean {
  if (trip.mapCenter) return true;
  if (trip.itinerary.some((day) => day.stops.some((stop) => stop.coordinates))) {
    return true;
  }
  if (trip.recommendations.some((recommendation) => recommendation.coordinates)) return true;
  const selectablePlaces =
    trip.recommendations.length +
    trip.itinerary.reduce((total, day) => total + day.stops.length, 0);
  return selectablePlaces >= 2;
}

export default function TripAppShell({
  trip,
  children,
}: {
  trip: Trip;
  children: ReactNode;
}) {
  const hasMap = hasMapPoints(trip);

  return (
    <div className="trip-shell">
      <a className="skip-link" href="#trip-main">
        Saltar al contenido del viaje
      </a>

      <header className="trip-topbar">
        <div className="container-editorial trip-topbar__inner">
          <Link
            href="/"
            className="trip-brand"
            aria-label="VaquitasLocas, volver al inicio"
          >
            <span className="trip-brand__mark" aria-hidden="true">
              V
            </span>
            <span className="trip-brand__name">VaquitasLocas</span>
          </Link>

          <div className="trip-topbar__destination" aria-label="Destino actual">
            <span>{trip.destination}</span>
            <span aria-hidden="true">·</span>
            <span>{trip.itinerary.length || "—"} días</span>
          </div>

          <div className="trip-topbar__actions">
            <div className="trip-header-share">
              <ShareButton
                tripId={trip.id}
                title={trip.title}
                destination={trip.destination}
              />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="trip-main" className="trip-page" tabIndex={-1}>
        {children}
      </main>

      <MobileTripDock
        hasItinerary={trip.itinerary.length > 0}
        hasSource={Boolean(trip.sourceWorkbook?.sheets.length)}
        hasMap={hasMap}
        hasRecommendations={trip.recommendations.length > 0}
      />
    </div>
  );
}
