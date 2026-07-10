import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Sin fecha";
  try {
    const d = new Date(iso);
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
  if (typeof lat === "number" && typeof lng === "number") {
    const q = query ? `/${encodeURIComponent(query)}` : "";
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${q}`;
  }
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return "https://www.google.com/maps";
}
