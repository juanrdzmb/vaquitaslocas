import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrip } from "@/lib/db";
import TripHero from "@/components/TripHero";
import DestinationTheme from "@/components/DestinationTheme";
import TripAppShell from "@/components/TripAppShell";
import TripNowCard from "@/components/TripNowCard";
import Itinerary from "@/components/Itinerary";
import FlightsTrains from "@/components/FlightsTrains";
import Hotels from "@/components/Hotels";
import Budget from "@/components/Budget";
import MapSection from "@/components/MapSection";
import Recommendations from "@/components/Recommendations";
import ChatPanel from "@/components/ChatPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function hasMapPoints(trip: Awaited<ReturnType<typeof getTrip>>): boolean {
  if (!trip) return false;
  if (trip.mapCenter) return true;
  if (trip.itinerary.some((day) => day.stops.some((stop) => stop.coordinates))) {
    return true;
  }
  return trip.recommendations.some((recommendation) => recommendation.coordinates);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Viaje no encontrado · VaquitasLocas" };
  return {
    title: `${trip.title} · VaquitasLocas`,
    description: trip.overview || trip.subtitle || `Viaje a ${trip.destination}`,
    robots: { index: false, follow: false },
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  const hasMap = hasMapPoints(trip);

  return (
    <DestinationTheme trip={trip}>
      <TripAppShell trip={trip}>
        <TripHero trip={trip} />
        <TripNowCard trip={trip} now={Date.now()} />

        <div className="trip-content">
          <FlightsTrains segments={trip.transport} />
          <Hotels stays={trip.hotels} />
          <Itinerary days={trip.itinerary} trip={trip} />
          <Budget items={trip.budget} />

          {hasMap && (
            <MapSection
              center={trip.mapCenter}
              itinerary={trip.itinerary}
              recommendations={trip.recommendations}
              tripId={trip.id}
            />
          )}

          <Recommendations recommendations={trip.recommendations} />

          {trip.tips.length > 0 && (
            <section className="container-editorial trip-tips py-16 md:py-24">
              <div className="flex items-baseline justify-between gap-4 pb-6">
                <h2 className="display-md tracking-tightest">Antes de salir</h2>
                <span className="section-number">A mano</span>
              </div>
              <div className="rule mb-10" />
              <ul className="trip-tips__grid">
                {trip.tips.map((tip, index) => (
                  <li key={`${tip}-${index}`}>
                    <span aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p>{tip}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="container-editorial trip-footer">
          <div>
            <span className="trip-footer__mark" aria-hidden="true">
              VL
            </span>
            <p>
              Hecho para Amanda, con café, mapas y una cantidad poco razonable de
              cariño.
            </p>
          </div>
          <Link href="/">
            Crear otro viaje <span aria-hidden="true">↗</span>
          </Link>
        </footer>

        <ChatPanel trip={trip} />
      </TripAppShell>
    </DestinationTheme>
  );
}
