"use client";

import { motion } from "framer-motion";
import type { TransportSegment } from "@/lib/schema";
import { formatCurrency, formatDate, googleMapsUrl, webSearchUrl } from "@/lib/utils";
import CalendarButton from "./CalendarButton";
import {
  AirplaneTiltIcon,
  ArrowsLeftRightIcon,
  BusIcon,
  TrainSimpleIcon,
} from "@phosphor-icons/react";

const TYPE_META: Record<TransportSegment["type"], { label: string }> = {
  flight: { label: "Vuelo" },
  train: { label: "Tren" },
  bus: { label: "Bus" },
  other: { label: "Traslado" },
};

function TransportIcon({ type }: { type: TransportSegment["type"] }) {
  const props = { size: 24, weight: "duotone" as const, "aria-hidden": true };
  if (type === "flight") return <AirplaneTiltIcon {...props} />;
  if (type === "train") return <TrainSimpleIcon {...props} />;
  if (type === "bus") return <BusIcon {...props} />;
  return <ArrowsLeftRightIcon {...props} />;
}

function totalsByCurrency(segments: TransportSegment[]): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const segment of segments) {
    if (segment.price == null) continue;
    const currency = segment.currency || "EUR";
    totals.set(currency, (totals.get(currency) ?? 0) + segment.price);
  }
  return [...totals.entries()];
}

export default function FlightsTrains({
  segments,
  sectionId = "reservas",
}: {
  segments: TransportSegment[];
  sectionId?: string;
}) {
  if (!segments.length) return null;
  const totals = totalsByCurrency(segments);

  return (
    <section id={sectionId} className="container-editorial scroll-mt-24 py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Movimientos importantes</p>
          <h2 className="display-md">Vuelos, trenes y esa fe ciega en los horarios</h2>
        </div>
        <span className="section-number">{segments.length} trayectos</span>
      </div>

      <div className="grid gap-4">
        {segments.map((segment, index) => {
          const meta = TYPE_META[segment.type];
          const checkInUrl =
            segment.checkInUrl ||
            (segment.type === "flight"
              ? webSearchUrl(`${segment.provider || segment.route} check-in online oficial`)
              : null);
          const mapUrl = googleMapsUrl({
            // La salida ya contiene su ciudad o estación. Añadir el destino
            // completo del viaje convertía, por ejemplo, Madrid airport en una
            // búsqueda absurda de "Madrid airport, Budapest, Praga".
            query: `${segment.departure} ${segment.type === "flight" ? "airport" : "station"}`,
            lat: segment.coordinates?.lat,
            lng: segment.coordinates?.lng,
          });

          return (
            <motion.article
              key={segment.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.16) }}
              className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--bg)]"
            >
              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.55fr_1.35fr_0.7fr] lg:items-center">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--fg)] text-[var(--bg)]" aria-hidden>
                    <TransportIcon type={segment.type} />
                  </span>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">{meta.label}</p>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">{segment.date ? formatDate(segment.date) : "Fecha por confirmar"}</p>
                    {(segment.provider || segment.serviceNumber) && (
                      <p className="mt-1 text-xs text-[var(--fg-muted)]">{[segment.provider, segment.serviceNumber].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div>
                      <p className="font-display text-xl leading-tight sm:text-2xl">{segment.departure}</p>
                      <p className="mt-1 font-mono text-xs text-[var(--fg-muted)]">{segment.departureTime || "—"}</p>
                    </div>
                    <div className="min-w-16 text-center">
                      <p className="font-mono text-[10px] text-[var(--accent)]">{segment.duration || ""}</p>
                      <div className="my-2 flex items-center" aria-hidden><span className="h-px flex-1 bg-[var(--line)]" /><span className="mx-1 text-[var(--accent)]">→</span><span className="h-px flex-1 bg-[var(--line)]" /></div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl leading-tight sm:text-2xl">{segment.arrival}</p>
                      <p className="mt-1 font-mono text-xs text-[var(--fg-muted)]">{segment.arrivalTime || "—"}</p>
                    </div>
                  </div>
                  {(segment.terminal || segment.platform) && (
                    <p className="mt-4 text-xs text-[var(--fg-muted)]">
                      {[segment.terminal && `Terminal ${segment.terminal}`, segment.platform && `Andén ${segment.platform}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4 lg:block lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">Importe</p>
                    <p className="mt-1 font-display text-xl">{segment.price == null ? "—" : formatCurrency(segment.price, segment.currency)}</p>
                  </div>
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline">Ver salida ↗</a>
                </div>
              </div>

              {segment.notes && <p className="border-t border-[var(--line)] bg-[var(--bg-alt)] px-5 py-3 text-xs leading-relaxed text-[var(--fg-muted)] sm:px-6">{segment.notes}</p>}

              <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-5 py-4 sm:px-6">
                {checkInUrl && (
                  <a href={checkInUrl} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 px-4 py-2.5 text-xs">
                    {segment.checkInUrl ? "Abrir check-in" : "Buscar check-in oficial"} ↗
                  </a>
                )}
                {segment.bookingUrl && (
                  <a href={segment.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-4 py-2.5 text-xs">Gestionar reserva ↗</a>
                )}
                <CalendarButton
                  event={{
                    title: `${meta.label}: ${segment.route}`,
                    date: segment.date,
                    startTime: segment.departureTime,
                    endTime: segment.arrivalTime,
                    location: segment.departure,
                    description: segment.notes,
                  }}
                />
              </div>
            </motion.article>
          );
        })}
      </div>

      {totals.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--fg)] px-5 py-4 text-[var(--bg)]">
          <span className="font-display text-lg">Total de transporte</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {totals.map(([currency, amount]) => <span key={currency} className="font-display text-xl">{formatCurrency(amount, currency)}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}
