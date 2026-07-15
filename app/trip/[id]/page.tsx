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
import { cache } from "react";
import { canonicalTripUrl, PRODUCTION_APP_URL } from "@/lib/app-url";
import RememberTrip from "@/components/RememberTrip";
import TripChapterDeck, {
  type TripChapterItem,
} from "@/components/TripChapterDeck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
const loadTrip = cache(getTrip);

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

function quantityLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) return { title: "Viaje no encontrado · VaquitasLocas" };
  const description = trip.overview || trip.subtitle || `Viaje a ${trip.destination}`;
  const canonical = canonicalTripUrl(id);
  return {
    metadataBase: new URL(PRODUCTION_APP_URL),
    title: `${trip.title} · VaquitasLocas`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${trip.title} · VaquitasLocas`,
      description,
      siteName: "VaquitasLocas",
    },
    robots: { index: false, follow: false },
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const trip = await loadTrip(id);
  if (!trip) notFound();
  const hasMap = hasMapPoints(trip);
  const destinationImage = await getDestinationImage(trip.destination);
  const tripEgg = easterEggFor("trip");
  const footerEgg = easterEggFor("footer");
  const totalStops = trip.itinerary.reduce(
    (total, day) => total + day.stops.length,
    0
  );
  const chapters: TripChapterItem[] = [];

  if (trip.transport.length || trip.hotels.length || trip.budget.length) {
    chapters.push({
      id: "reservas",
      hashes: ["reservas-contenido"],
      title: "Billetes, camas y cuentas",
      description: "Transportes, alojamientos y presupuesto en el mismo cajón.",
      meta:
        [
          trip.transport.length ? `${trip.transport.length} trayectos` : "",
          trip.hotels.length ? `${trip.hotels.length} hoteles` : "",
          trip.budget.length ? `${trip.budget.length} gastos` : "",
        ]
          .filter(Boolean)
          .join(" · ") || "Todo a mano",
      icon: "logistics",
      content: (
        <>
          <FlightsTrains
            segments={trip.transport}
            sectionId="reservas-contenido"
          />
          <Hotels stays={trip.hotels} destination={trip.destination} />
          <Budget items={trip.budget} />
        </>
      ),
    });
  }

  if (trip.itinerary.length) {
    chapters.push({
      id: "itinerario",
      hashes: ["itinerario-contenido"],
      prefixes: ["dia-"],
      title: "El día a día",
      description: "Un día visible cada vez, con sus horas, rutas y notas prácticas.",
      meta: `${trip.itinerary.length} días · ${totalStops} paradas`,
      icon: "itinerary",
      content: (
        <Itinerary
          days={trip.itinerary}
          trip={trip}
          sectionId="itinerario-contenido"
        />
      ),
    });
  }

  if (hasMap) {
    chapters.push({
      id: "mapa",
      hashes: ["mapa-contenido", "route-builder", "trip-map-panel", "nearby-results"],
      title: "Mapa y recorridos",
      description: "Lugares concretos y rutas de varias paradas sin salir desde tu sofá.",
      meta: "Hasta 5 paradas",
      icon: "map",
      content: (
        <MapSection
          center={trip.mapCenter}
          itinerary={trip.itinerary}
          recommendations={trip.recommendations}
          tripId={trip.id}
          destination={trip.destination}
          sectionId="mapa-contenido"
        />
      ),
    });
  }

  if (trip.recommendations.length || trip.tips.length) {
    chapters.push({
      id: "recomendaciones",
      hashes: ["recomendaciones-contenido", "antes-de-salir"],
      title: "Ideas extra",
      description: "Planes nuevos que encajan con Amanda y avisos que sí tienen contexto.",
      meta: `${quantityLabel(trip.recommendations.length, "idea", "ideas")} · ${quantityLabel(trip.tips.length, "aviso", "avisos")}`,
      icon: "ideas",
      content: (
        <>
          <Recommendations
            recommendations={trip.recommendations}
            destination={trip.destination}
            sectionId="recomendaciones-contenido"
          />

          {trip.tips.length > 0 && (
            <section
              id="antes-de-salir"
              className="container-editorial trip-tips scroll-mt-24 py-16 md:py-24"
            >
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
        </>
      ),
    });
  }

  return (
    <DestinationTheme trip={trip}>
      <TripAppShell trip={trip}>
        <RememberTrip trip={trip} destinationImage={destinationImage} />
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
          <TripChapterDeck
            chapters={chapters}
            initialChapterId={null}
          />
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
