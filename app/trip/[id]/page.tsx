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
import EasterEggSticker from "@/components/EasterEggSticker";
import { easterEggFor } from "@/config/easter-eggs";
import { getDestinationImage } from "@/lib/destination-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function hasMapPoints(trip: Awaited<ReturnType<typeof getTrip>>): boolean {
  if (!trip) return false;
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
  const destinationImage = await getDestinationImage(trip.destination);
  const tripEgg = easterEggFor("trip");
  const footerEgg = easterEggFor("footer");

  return (
    <DestinationTheme trip={trip}>
      <TripAppShell trip={trip}>
        <TripHero trip={trip} destinationImage={destinationImage} />
        <TripNowCard trip={trip} now={Date.now()} />

        {tripEgg && (
          <aside className="container-editorial flex justify-end pt-3" aria-label="Secreto escondido">
            <div className="group flex items-center gap-2 text-[10px] text-[var(--fg-muted)]">
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-44 group-hover:opacity-100">
                No la toques. Claramente.
              </span>
              <EasterEggSticker egg={tripEgg} />
            </div>
          </aside>
        )}

        <div className="trip-content">
          <FlightsTrains segments={trip.transport} destination={trip.destination} />
          <Hotels stays={trip.hotels} destination={trip.destination} />
          <Itinerary days={trip.itinerary} trip={trip} />
          <Budget items={trip.budget} />

          {hasMap && (
            <MapSection
              center={trip.mapCenter}
              itinerary={trip.itinerary}
              recommendations={trip.recommendations}
              tripId={trip.id}
              destination={trip.destination}
            />
          )}

          <Recommendations recommendations={trip.recommendations} destination={trip.destination} />

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
            {footerEgg ? (
              <EasterEggSticker egg={footerEgg} variant="footer" />
            ) : (
              <span className="trip-footer__mark" aria-hidden="true">VL</span>
            )}
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
