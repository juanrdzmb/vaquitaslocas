"use client";

import { motion } from "framer-motion";
import type { HotelStay } from "@/lib/schema";
import { formatCurrency, formatDate, googleDirectionsUrl, googleMapsUrl, webSearchUrl } from "@/lib/utils";
import { MapPinIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import CalendarButton from "./CalendarButton";

const STATUS_META: Record<HotelStay["paymentStatus"], { label: string; dot: string }> = {
  paid: { label: "Pagado", dot: "bg-emerald-500" },
  pending: { label: "Pago pendiente", dot: "bg-amber-500" },
  free_cancellation: { label: "Cancelación gratis", dot: "bg-sky-500" },
  unknown: { label: "Por confirmar", dot: "bg-[var(--fg-muted)]" },
};

function totalsByCurrency(stays: HotelStay[]): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const stay of stays) {
    if (stay.totalPrice == null) continue;
    const currency = stay.currency || "EUR";
    totals.set(currency, (totals.get(currency) ?? 0) + stay.totalPrice);
  }
  return [...totals.entries()];
}

export default function Hotels({ stays, destination }: { stays: HotelStay[]; destination: string }) {
  if (!stays.length) return null;
  const totals = totalsByCurrency(stays);

  return (
    <section className="container-editorial py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Cuartel general</p>
          <h2 className="display-md">Dónde duermes — o por lo menos lo intentas</h2>
        </div>
        <span className="section-number">{stays.length} alojamientos</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {stays.map((stay, index) => {
          const status = STATUS_META[stay.paymentStatus];
          const placeQuery = stay.address
            ? `${stay.name}, ${stay.address}`
            : `${stay.name}, ${stay.city || destination}`;
          const placeUrl = googleMapsUrl({
            query: placeQuery,
            lat: stay.coordinates?.lat,
            lng: stay.coordinates?.lng,
          });
          const directions = googleDirectionsUrl({
            destination: placeQuery,
            lat: stay.coordinates?.lat,
            lng: stay.coordinates?.lng,
            travelMode: "walking",
          });
          const officialSite = stay.websiteUrl || webSearchUrl(`${stay.name} ${stay.city} sitio oficial`);

          return (
            <motion.article
              key={stay.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: (index % 2) * 0.05 }}
              className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--bg)]"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent)]">{stay.city || "Alojamiento"}</p>
                    <h3 className="mt-2 font-display text-2xl leading-tight tracking-tightest sm:text-3xl">{stay.name}</h3>
                  </div>
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--line)] px-3 text-[11px]">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {stay.address && <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">{stay.address}</p>}

                <div className="hotel-dates-grid mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[var(--bg-alt)] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--fg-muted)]">Check-in</p>
                    <p className="mt-2 font-display text-lg leading-tight">{stay.checkInDate ? formatDate(stay.checkInDate) : "Por confirmar"}</p>
                    {stay.checkInTime && <p className="mt-1 text-xs text-[var(--accent)]">desde {stay.checkInTime}</p>}
                  </div>
                  <div className="rounded-2xl bg-[var(--bg-alt)] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--fg-muted)]">Check-out</p>
                    <p className="mt-2 font-display text-lg leading-tight">{stay.checkOutDate ? formatDate(stay.checkOutDate) : "Por confirmar"}</p>
                    {stay.checkOutTime && <p className="mt-1 text-xs text-[var(--accent)]">antes de {stay.checkOutTime}</p>}
                  </div>
                </div>

                {stay.cancellationDeadline && (
                  <div className="mt-4 flex gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-xs leading-relaxed">
                    <span aria-hidden>⏳</span>
                    <span><strong>Ojo con la cancelación:</strong> {formatDate(stay.cancellationDeadline)}</span>
                  </div>
                )}
                {stay.notes && <p className="mt-4 text-xs italic leading-relaxed text-[var(--fg-muted)]">{stay.notes}</p>}
              </div>

              <div className="mt-auto border-t border-[var(--line)] bg-[var(--bg-alt)] p-5 sm:p-6">
                <div className="hotel-card__summary flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    {stay.nights != null && <p className="text-xs text-[var(--fg-muted)]">{stay.nights} {stay.nights === 1 ? "noche" : "noches"}</p>}
                    <p className="mt-1 break-words font-display text-2xl [overflow-wrap:anywhere]">{stay.totalPrice == null ? "Precio por confirmar" : formatCurrency(stay.totalPrice, stay.currency)}</p>
                    {stay.pricePerNight != null && <p className="mt-1 font-mono text-[10px] text-[var(--fg-muted)]">{formatCurrency(stay.pricePerNight, stay.currency)} / noche</p>}
                  </div>
                  <div className="hotel-card__map-actions flex flex-wrap justify-end gap-2">
                    <a href={placeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--fg)] px-4 text-xs font-medium text-[var(--bg)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]">
                      <MapPinIcon size={15} weight="duotone" aria-hidden /> Ver hotel
                    </a>
                    <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] px-4 text-xs font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                      <NavigationArrowIcon size={15} weight="duotone" aria-hidden /> Cómo llegar
                    </a>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {stay.checkInUrl && <a href={stay.checkInUrl} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-11 px-4 py-2.5 text-xs">Check-in online ↗</a>}
                  {stay.bookingUrl && <a href={stay.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-4 py-2.5 text-xs">Gestionar reserva ↗</a>}
                  <a href={officialSite} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-11 px-4 py-2.5 text-xs">{stay.websiteUrl ? "Web del hotel" : "Buscar web oficial"} ↗</a>
                  <CalendarButton event={{ title: `Hotel: ${stay.name}`, date: stay.checkInDate, startTime: stay.checkInTime, endDate: stay.checkOutDate, endTime: stay.checkOutTime, location: stay.address, description: stay.notes }} />
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {totals.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--fg)] px-5 py-4 text-[var(--bg)]">
          <span className="font-display text-lg">Total de alojamientos</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">{totals.map(([currency, amount]) => <span key={currency} className="font-display text-xl">{formatCurrency(amount, currency)}</span>)}</div>
        </div>
      )}
    </section>
  );
}
