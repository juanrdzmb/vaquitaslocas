"use client";

import { useState } from "react";
import type { Trip, ItineraryDay } from "@/lib/schema";
import { formatDate, formatCurrency, googleMapsUrl } from "@/lib/utils";

type Props = {
  trip: Trip;
  day?: ItineraryDay;
  full?: boolean;
};

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

    const days = day ? [day] : trip.itinerary;
    const title = day
      ? `Día ${day.dayNumber} — ${day.title}`
      : trip.title;

    const html = buildPrintHtml(trip, days, title);

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setGenerating(false);
    }, 500);
  }

  return (
    <button
      onClick={handlePrint}
      disabled={generating}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
    >
      {generating ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const dayHtml = days
    .map((day) => {
      const stops = day.stops
        .map((stop) => {
          const mapsLink = googleMapsUrl({
            query: stop.location
              ? `${stop.title}, ${stop.location}`
              : stop.title,
            lat: stop.coordinates?.lat,
            lng: stop.coordinates?.lng,
          });
          return `
          <div class="stop">
            <div class="stop-time">${stop.time ?? ""}</div>
            <div class="stop-content">
              <h4>${stop.title}</h4>
              ${stop.location ? `<p class="loc">${stop.location}</p>` : ""}
              <p>${stop.description}</p>
              <div class="meta">
                ${stop.duration ? `<span>⏱ ${stop.duration}</span>` : ""}
                ${stop.cost ? `<span>${stop.cost}</span>` : ""}
                <a href="${mapsLink}" target="_blank">Ver en Google Maps</a>
              </div>
            </div>
          </div>`;
        })
        .join("");

      return `
        <div class="day">
          <div class="day-header">
            <span class="day-num">${String(day.dayNumber).padStart(2, "0")}</span>
            <div>
              <h3>${day.title}</h3>
              <p class="date">${formatDate(day.date)}</p>
            </div>
          </div>
          ${day.summary ? `<p class="summary">${day.summary}</p>` : ""}
          ${stops}
        </div>`;
    })
    .join("");

  const hotelsHtml = trip.hotels.length
    ? trip.hotels
        .map(
          (h) => `
        <div class="hotel-card">
          <h4>${h.name}</h4>
          <p class="loc">${h.city}${h.address ? ` · ${h.address}` : ""}</p>
          <div class="hotel-meta">
            <span><strong>Check in:</strong> ${formatDate(h.checkInDate)} ${h.checkInTime ?? ""}</span>
            <span><strong>Check out:</strong> ${formatDate(h.checkOutDate)} ${h.checkOutTime ?? ""}</span>
            ${h.totalPrice != null ? `<span><strong>Total:</strong> ${formatCurrency(h.totalPrice, h.currency)}</span>` : ""}
          </div>
          ${h.cancellationDeadline ? `<p class="cancel">Cancelación gratis hasta ${formatDate(h.cancellationDeadline)}</p>` : ""}
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
          <span class="t-route"><strong>${t.departure}</strong> → <strong>${t.arrival}</strong></span>
          <span class="t-date">${formatDate(t.date)}</span>
          <span class="t-time">${t.departureTime ?? ""} - ${t.arrivalTime ?? ""}</span>
          ${t.price != null ? `<span class="t-price">${formatCurrency(t.price, t.currency)}</span>` : ""}
        </div>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title} — VaquitasLocas</title>
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
    <h1>${trip.title}</h1>
    <div class="sub">${trip.destination} · ${formatDate(trip.startDate)} — ${formatDate(trip.endDate)}</div>
    ${trip.overview ? `<p style="color:#555; font-size:14px; margin-top:8px;">${trip.overview}</p>` : ""}
  </div>

  ${transportHtml ? `<h2>Vuelos y trenes</h2>${transportHtml}` : ""}

  ${hotelsHtml ? `<h2>Hoteles</h2>${hotelsHtml}` : ""}

  <h2>${days.length === 1 ? "Día del viaje" : "Itinerario completo"}</h2>
  ${dayHtml}

  <div class="footer">Hecho con café y corazón · VaquitasLocas</div>
</body>
</html>`;
}
