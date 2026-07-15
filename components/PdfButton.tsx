"use client";

import { useState } from "react";
import type { Trip, ItineraryDay } from "@/lib/schema";
import { formatDate, formatCurrency, googleMapsUrl } from "@/lib/utils";
import { matchSourceSheetForDay } from "@/lib/source-workbook";
import { DownloadSimpleIcon } from "@phosphor-icons/react";

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
  const [printError, setPrintError] = useState("");

  async function handlePrint() {
    setGenerating(true);
    setPrintError("");

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      setPrintError("El navegador bloqueó la ventana. Permite ventanas emergentes y vuelve a tocar el botón.");
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

    try {
      await waitForPrintAssets(printWindow);
      printWindow.focus();
      printWindow.print();
    } catch {
      setPrintError("No pude preparar todas las imágenes. Inténtalo otra vez.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
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
          <DownloadSimpleIcon size={15} weight="duotone" aria-hidden />
        )}
        {generating ? "Preparando…" : full ? "Guardar PDF del viaje" : "Guardar PDF del día"}
      </button>
      {printError && <span role="alert" className="max-w-64 text-[11px] leading-snug text-[var(--accent)]">{printError}</span>}
    </span>
  );
}

async function waitForPrintAssets(printWindow: Window): Promise<void> {
  const document = printWindow.document;
  const images = Array.from(document.images).map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }
    try {
      await image.decode?.();
    } catch {
      // Una imagen que no decodifica no debe bloquear el resto del documento.
    }
  });
  const fonts = document.fonts?.ready ?? Promise.resolve();
  await Promise.race([
    Promise.all([fonts, ...images]),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  await new Promise<void>((resolve) =>
    printWindow.requestAnimationFrame(() =>
      printWindow.requestAnimationFrame(() => resolve())
    )
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

  const sourceSheets = trip.sourceWorkbook
    ? days.length === trip.itinerary.length
      ? trip.sourceWorkbook.sheets
      : days
          .map((item) => matchSourceSheetForDay(trip.sourceWorkbook, item))
          .filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet))
    : [];
  const sourceHtml = sourceSheets
    .map((sheet) => {
      const rows = sheet.rows
        .map(
          (row) => `<div class="source-row">
            <span class="source-number">${escapeHtml(String(row.row))}</span>
            <div>${row.cells
              .map((cell) => {
                const link = cell.url || (/^https?:\/\//i.test(cell.value) ? cell.value : "");
                const value = `<span>${escapeHtml(cell.value)}</span>`;
                return link
                  ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${value}</a>`
                  : value;
              })
              .join('<span class="cell-separator"> · </span>')}</div>
          </div>`
        )
        .join("");
      const images = (sheet.images ?? [])
        .map(
          (image) => `<figure class="source-image"><img src="${image.dataUrl}" alt="${escapeHtml(image.alt || "Imagen incrustada en el Excel")}"><figcaption>Imagen original · fila ${escapeHtml(image.row)}</figcaption></figure>`
        )
        .join("");
      return `<section class="source-sheet"><h3>${escapeHtml(sheet.name)}</h3>${rows}${images}</section>`;
    })
    .join("");

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
  .source-sheet { margin: 0 0 24px; break-inside: auto; }
  .source-sheet h3 { font-size: 18px; margin: 0 0 8px; padding: 8px 10px; background: #f3ece4; border-radius: 8px; }
  .source-row { display: grid; grid-template-columns: 28px 1fr; gap: 8px; padding: 5px 0; border-bottom: 1px solid #eee; font: 12px/1.45 Arial, sans-serif; break-inside: avoid; }
  .source-number { color: #999; font: 10px/1.6 monospace; text-align: right; }
  .source-row a { color: #8f3f22; }
  .cell-separator { color: #aaa; }
  .source-image { margin: 12px 0; break-inside: avoid; }
  .source-image img { display: block; max-width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
  .source-image figcaption { margin-top: 4px; color: #777; font: 10px Arial, sans-serif; }
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

  ${sourceHtml ? `<h2>Texto original del Excel</h2><p class="summary">Aquí está lo que escribió Amanda, sin resumir ni reescribir.</p>${sourceHtml}` : ""}

  <h2>${days.length === 1 ? "Vista práctica del día" : "Vista práctica del itinerario"}</h2>
  ${dayHtml}

  <div class="footer">Hecho con café y corazón · VaquitasLocas</div>
</body>
</html>`;
}
