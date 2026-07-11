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

export type GoogleMapsPoint = {
  query?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type GoogleMapsTravelMode =
  | "walking"
  | "driving"
  | "bicycling"
  | "transit";

// Google Maps supports more waypoints on desktop, but mobile browsers only
// guarantee three. Five places = origin + 3 waypoints + destination, so the
// same route works when Amanda opens it on her iPhone.
export const GOOGLE_MAPS_ROUTE_MAX_STOPS = 5;
export const GOOGLE_MAPS_URL_MAX_LENGTH = 2048;

function isValidMapCoordinate(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= maximum;
}

function cleanMapQuery(query: string | null | undefined): string {
  return (query ?? "").replace(/\s+/g, " ").trim();
}

function truncateForEncodedLength(value: string, maximum: number): string {
  let result = "";
  for (const character of value) {
    const candidate = result + character;
    if (encodeURIComponent(candidate).length > maximum) break;
    result = candidate;
  }
  return result.trim();
}

function coordinatesValue(point: GoogleMapsPoint): string | null {
  if (!isValidMapCoordinate(point.lat, 90) || !isValidMapCoordinate(point.lng, 180)) {
    return null;
  }
  return `${point.lat},${point.lng}`;
}

function routePointValue(point: GoogleMapsPoint): string {
  // Coordinates make a multi-stop route exact and keep its URL comfortably
  // under Google's 2,048-character limit. The human label still stays in UI.
  const coordinates = coordinatesValue(point);
  if (coordinates) return coordinates;
  return truncateForEncodedLength(cleanMapQuery(point.query), 220);
}

export function googleMapsUrl(opts: {
  query?: string | null;
  lat?: number | null;
  lng?: number | null;
}): string {
  const { query, lat, lng } = opts;
  const cleanQuery = cleanMapQuery(query);
  if (cleanQuery) {
    const params = new URLSearchParams({ api: "1", query: cleanQuery });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
  const coordinates = coordinatesValue({ lat, lng });
  if (coordinates) {
    const params = new URLSearchParams({ api: "1", query: coordinates });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
  return "https://www.google.com/maps";
}

export function googleDirectionsUrl(opts: {
  destination: string;
  lat?: number;
  lng?: number;
  travelMode?: GoogleMapsTravelMode;
}): string {
  const destination = cleanMapQuery(opts.destination) ||
    coordinatesValue({ lat: opts.lat, lng: opts.lng }) || "";
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: opts.travelMode ?? "walking",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMultiStopDirectionsUrl(opts: {
  stops: GoogleMapsPoint[];
  travelMode?: Exclude<GoogleMapsTravelMode, "transit">;
}): string | null {
  const stops = opts.stops
    .map((stop) => ({ stop, value: routePointValue(stop) }))
    .filter((item) => item.value)
    .slice(0, GOOGLE_MAPS_ROUTE_MAX_STOPS);

  if (stops.length < 2) return null;

  const params = new URLSearchParams({
    api: "1",
    origin: stops[0].value,
    destination: stops[stops.length - 1].value,
    travelmode: opts.travelMode ?? "walking",
  });
  const waypoints = stops.slice(1, -1).map((item) => item.value);
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));

  const url = `https://www.google.com/maps/dir/?${params.toString()}`;
  return url.length <= GOOGLE_MAPS_URL_MAX_LENGTH ? url : null;
}

export function webSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
