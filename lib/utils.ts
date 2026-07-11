import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  try {
    const localDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    const d = localDate
      ? new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]))
      : new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Fechas por definir";
  if (start && end) {
    return `${formatDate(start)} — ${formatDate(end)}`;
  }
  return formatDate(start ?? end);
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function googleMapsUrl(opts: {
  query?: string;
  lat?: number;
  lng?: number;
}): string {
  const { query, lat, lng } = opts;
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  return "https://www.google.com/maps";
}

export function googleDirectionsUrl(opts: {
  destination: string;
  lat?: number;
  lng?: number;
  travelMode?: "walking" | "driving" | "bicycling" | "transit";
}): string {
  const destination = opts.destination.trim() ||
    (typeof opts.lat === "number" && typeof opts.lng === "number"
      ? `${opts.lat},${opts.lng}`
      : "");
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: opts.travelMode ?? "walking",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function webSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
