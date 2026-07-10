import { notFound } from "next/navigation";
import Link from "next/link";
import { getTrip } from "@/lib/db";
import TripHero from "@/components/TripHero";
import Itinerary from "@/components/Itinerary";
import FlightsTrains from "@/components/FlightsTrains";
import Hotels from "@/components/Hotels";
import Budget from "@/components/Budget";
import MapSection from "@/components/MapSection";
import Recommendations from "@/components/Recommendations";
import ChatPanel from "@/components/ChatPanel";
import ShareButton from "@/components/ShareButton";
import ThemeToggle from "@/components/ThemeToggle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return { title: "Viaje no encontrado · VaquitasLocas" };
  return {
    title: `${trip.title} · VaquitasLocas`,
    description: trip.overview || trip.subtitle || `Viaje a ${trip.destination}`,
  };
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  return (
    <main className="min-h-screen">
      <div className="container-editorial sticky top-0 z-40 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg)]/85 py-4 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl tracking-tightest">
            VaquitasLocas
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </Link>
        <div className="flex items-center gap-3">
          <ShareButton tripId={trip.id} />
          <ThemeToggle />
        </div>
      </div>

      <TripHero trip={trip} />

      <FlightsTrains segments={trip.transport} />

      <Hotels stays={trip.hotels} />

      <Itinerary days={trip.itinerary} />

      <Budget items={trip.budget} />

      <MapSection
        center={trip.mapCenter}
        itinerary={trip.itinerary}
        recommendations={trip.recommendations}
        tripId={trip.id}
      />

      <Recommendations recommendations={trip.recommendations} />

      {/* Tips */}
      {trip.tips.length > 0 && (
        <section className="container-editorial py-16 md:py-24">
          <div className="flex items-baseline justify-between gap-4 pb-6">
            <h2 className="display-md tracking-tightest">Antes de salir</h2>
            <span className="section-number">05</span>
          </div>
          <div className="rule mb-12" />
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
            {trip.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-4 bg-[var(--bg)] p-7"
              >
                <span className="font-mono text-xs text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-base leading-relaxed text-balance">{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="container-editorial py-12">
        <div className="rule mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--fg-muted)]">
          <Link href="/" className="font-mono hover:text-[var(--fg)]">
            ← Crear otro viaje
          </Link>
          <span className="font-display italic">Hecho con café y corazón</span>
        </div>
      </footer>

      <ChatPanel trip={trip} />
    </main>
  );
}
