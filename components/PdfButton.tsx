"use client";

import { useState } from "react";
import type { Trip, ItineraryDay } from "@/lib/schema";
import { formatDate, formatCurrency, googleMapsUrl } from "@/lib/utils";

type Props = {
  trip: Trip;
  day?: ItineraryDay;
  full?: boolean;
};

function escapeHtml(value: unknown): string {
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

export default function PdfButton({ trip, day, full }: Props) {
  const [generating, setGenerating] = useState(false);

  function handlePrint() {
    setGenerating(true);

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      window.print();
      setGenerating(false);
      return;
    }

    try {
      printWindow.opener = null;
    } catch {
      // Some browsers expose opener as read-only.
    }

    const days = day ? [day] : trip.itinerary;
    const title = day
      ? `Día ${day.dayNumber} — ${day.title}`
      : trip.title;

    const html = buildPrintHtml(trip, days, title);

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        setGenerating(false);
      }
    }, 500);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={generating}
      aria-busy={generating}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {generating ? (
        <span
          aria-hidden="true"
          className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]"
        />
      ) : (
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      )}
      {generating ? "Abriendo…" : full ? "PDF del viaje" : "PDF del día"}
    </button>
  );
}

function buildPrintHtml(
  trip: Trip,
  days: ItineraryDay[],
  title: string
): string {
  const safeDate = (value: string | null | undefined) =>
    escapeHtml(formatDate(value));
  const safeCurrency = (amount: number, currency: string) =>
    escapeHtml(formatCurrency(amount, currency));

  const dayHtml = days
    .map((day) => {
      const stops = day.stops
        .map((stop) => {
          const mapsLink = googleMapsUrl({
            query: stop.location
              ? `${stop.title}, ${stop.location}`
              : `${stop.title}, ${trip.destination}`,
            lat: stop.coordinates?.lat,
            lng: stop.coordinates?.lng,
          });
          return `
          <div class="stop">
            <div class="stop-time">${escapeHtml(stop.time)}</div>
            <div class="stop-content">
              <h4>${escapeHtml(stop.title)}</h4>
              ${stop.location ? `<p class="loc">${escapeHtml(stop.location)}</p>` : ""}
              <p>${escapeHtml(stop.description)}</p>
              <div class="meta">
                ${stop.duration ? `<span>⏱ ${escapeHtml(stop.duration)}</span>` : ""}
                ${stop.cost ? `<span>${escapeHtml(stop.cost)}</span>` : ""}
                <a href="${escapeHtml(mapsLink)}" target="_blank" rel="noopener noreferrer">Ver en Google Maps</a>
              </div>
            </div>
          </div>`;
        })
        .join("");

      return `
        <div class="day">
          <div class="day-header">
            <span class="day-num">${escapeHtml(String(day.dayNumber).padStart(2, "0"))}</span>
            <div>
              <h3>${escapeHtml(day.title)}</h3>
              <p class="date">${safeDate(day.date)}</p>
            </div>
          </div>
          ${day.summary ? `<p class="summary">${escapeHtml(day.summary)}</p>` : ""}
          ${stops}
        </div>`;
    })
    .join("");

  const hotelsHtml = trip.hotels.length
    ? trip.hotels
        .map(
          (h) => `
        <div class="hotel-card">
          <h4>${escapeHtml(h.name)}</h4>
          <p class="loc">${escapeHtml(h.city)}${h.address ? ` · ${escapeHtml(h.address)}` : ""}</p>
          <div class="hotel-meta">
            <span><strong>Check in:</strong> ${safeDate(h.checkInDate)} ${escapeHtml(h.checkInTime)}</span>
            <span><strong>Check out:</strong> ${safeDate(h.checkOutDate)} ${escapeHtml(h.checkOutTime)}</span>
            ${h.totalPrice != null ? `<span><strong>Total:</strong> ${safeCurrency(h.totalPrice, h.currency)}</span>` : ""}
          </div>
          ${h.cancellationDeadline ? `<p class="cancel">Cancelación gratis hasta ${safeDate(h.cancellationDeadline)}</p>` : ""}
        </div>`
        )
        .join("")
    : "";

  const transportHtml = trip.transport.length
    ? trip.transport
        .map(
          (t) => `
        <div class="transport-row">
          <span class="t-type">${t.type === "flight" ? "✈" : t.type === "train" ? "🚆" : "→"}</span>
          <span class="t-route"><strong>${escapeHtml(t.departure)}</strong> → <strong>${escapeHtml(t.arrival)}</strong></span>
          <span class="t-date">${safeDate(t.date)}</span>
          <span class="t-time">${escapeHtml(t.departureTime)} - ${escapeHtml(t.arrivalTime)}</span>
          ${t.price != null ? `<span class="t-price">${safeCurrency(t.price, t.currency)}</span>` : ""}
        </div>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — VaquitasLocas</title>
<style>
  @page { margin: 2cm; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1a1a1a;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .header { border-bottom: 2px solid #b5532f; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 28px; margin: 0 0 4px; }
  .header .sub { color: #6b6b6b; font-size: 14px; }
  h2 { font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 32px; }
  .day { margin-bottom: 32px; page-break-inside: avoid; }
  .day-header { display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
  .day-num { font-size: 36px; color: #b5532f; font-weight: bold; }
  .day-header h3 { margin: 0; font-size: 22px; }
  .date { color: #6b6b6b; font-size: 13px; margin: 2px 0 0; }
  .summary { color: #555; font-style: italic; margin-bottom: 16px; }
  .stop { display: flex; gap: 12px; padding: 10px 0; border-left: 2px solid #ddd; padding-left: 12px; }
  .stop-time { font-size: 12px; color: #b5532f; font-weight: bold; min-width: 50px; padding-top: 2px; }
  .stop-content h4 { margin: 0 0 2px; font-size: 16px; }
  .stop-content .loc { font-size: 12px; color: #888; margin: 0 0 4px; }
  .stop-content p { font-size: 13px; color: #555; margin: 0 0 6px; }
  .meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #888; }
  .meta a { color: #b5532f; text-decoration: none; }
  .hotel-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .hotel-card h4 { margin: 0 0 4px; font-size: 16px; }
  .hotel-card .loc { font-size: 12px; color: #888; margin: 0 0 8px; }
  .hotel-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; }
  .hotel-meta span { color: #555; }
  .cancel { font-size: 11px; color: #b5532f; margin: 6px 0 0; }
  .transport-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }
  .t-type { font-size: 18px; }
  .t-route { flex: 1; }
  .t-date, .t-time { color: #6b6b6b; }
  .t-price { color: #b5532f; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px; font-style: italic; }
  @media print { body { max-width: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(trip.title)}</h1>
    <div class="sub">${escapeHtml(trip.destination)} · ${safeDate(trip.startDate)} — ${safeDate(trip.endDate)}</div>
    ${trip.overview ? `<p style="color:#555; font-size:14px; margin-top:8px;">${escapeHtml(trip.overview)}</p>` : ""}
  </div>

  ${transportHtml ? `<h2>Vuelos y trenes</h2>${transportHtml}` : ""}

  ${hotelsHtml ? `<h2>Hoteles</h2>${hotelsHtml}` : ""}

  <h2>${days.length === 1 ? "Día del viaje" : "Itinerario completo"}</h2>
  ${dayHtml}

  <div class="footer">Hecho con café y corazón · VaquitasLocas</div>
</body>
</html>`;
}
