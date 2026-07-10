"use client";

import { motion } from "framer-motion";
import type { HotelStay } from "@/lib/schema";
import { formatDate, formatCurrency, googleMapsUrl } from "@/lib/utils";

const STATUS_META: Record<
  HotelStay["paymentStatus"],
  { label: string; color: string }
> = {
  paid: { label: "Pagado", color: "var(--accent)" },
  pending: { label: "Pendiente de pago", color: "var(--fg-muted)" },
  free_cancellation: { label: "Cancelación gratis", color: "var(--accent)" },
  unknown: { label: "Estado por confirmar", color: "var(--fg-muted)" },
};

export default function Hotels({ stays }: { stays: HotelStay[] }) {
  if (!stays.length) return null;

  const total = stays.reduce((sum, h) => sum + (h.totalPrice ?? 0), 0);
  const currency = stays[0]?.currency ?? "EUR";

  return (
    <section className="container-editorial py-16 md:py-24">
      <div className="flex items-baseline justify-between gap-4 pb-6">
        <h2 className="display-md tracking-tightest">Dónde te quedas</h2>
        <span className="section-number">Hoteles</span>
      </div>
      <div className="rule mb-12" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {stays.map((h, i) => {
          const status = STATUS_META[h.paymentStatus];
          const mapsUrl = googleMapsUrl({
            query: h.address ? `${h.name}, ${h.address}` : h.name,
            lat: h.coordinates?.lat,
            lng: h.coordinates?.lng,
          });

          return (
            <motion.article
              key={h.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.05 }}
              className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 transition-colors hover:bg-[var(--bg-alt)]"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="font-display text-2xl leading-tight tracking-tightest">
                    {h.name}
                  </h3>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      color: status.color,
                      border: `1px solid ${status.color}`,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="font-mono text-xs text-[var(--fg-muted)]">
                  {h.city}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--bg-alt)] p-4">
                  <p className="section-number mb-1">Check in</p>
                  <p className="font-display text-lg leading-tight">
                    {h.checkInDate ? formatDate(h.checkInDate) : "—"}
                  </p>
                  {h.checkInTime && (
                    <p className="font-mono text-xs text-[var(--fg-muted)]">
                      desde {h.checkInTime}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-[var(--bg-alt)] p-4">
                  <p className="section-number mb-1">Check out</p>
                  <p className="font-display text-lg leading-tight">
                    {h.checkOutDate ? formatDate(h.checkOutDate) : "—"}
                  </p>
                  {h.checkOutTime && (
                    <p className="font-mono text-xs text-[var(--fg-muted)]">
                      antes de {h.checkOutTime}
                    </p>
                  )}
                </div>
              </div>

              {h.nights && (
                <p className="font-mono text-xs text-[var(--fg-muted)]">
                  {h.nights} {h.nights === 1 ? "noche" : "noches"}
                </p>
              )}

              {h.address && (
                <p className="text-sm text-[var(--fg-muted)]">{h.address}</p>
              )}

              {h.cancellationDeadline && (
                <div className="flex items-start gap-2 rounded-xl border border-[var(--line)] p-3 text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>
                    <strong className="text-[var(--accent)]">Cancelación gratis</strong>{" "}
                    hasta {formatDate(h.cancellationDeadline)}
                  </span>
                </div>
              )}

              {h.notes && (
                <p className="text-xs italic text-[var(--fg-muted)]">{h.notes}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                  {h.pricePerNight != null && (
                    <p className="font-mono text-xs text-[var(--fg-muted)]">
                      {formatCurrency(h.pricePerNight, h.currency)} / noche
                    </p>
                  )}
                  {h.totalPrice != null && (
                    <p className="font-display text-xl">
                      {formatCurrency(h.totalPrice, h.currency)}
                    </p>
                  )}
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Cómo llegar
                </a>
              </div>
            </motion.article>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-6 flex items-center justify-between border-t-2 border-[var(--fg)] pt-4">
          <span className="font-display text-lg">Total hoteles</span>
          <span className="font-display text-2xl">
            {formatCurrency(total, currency)}
          </span>
        </div>
      )}
    </section>
  );
}
