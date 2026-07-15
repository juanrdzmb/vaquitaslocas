import type { TripVisualTheme } from "./schema";
import type { DestinationImage } from "./destination-image";

export const TRIP_LIBRARY_STORAGE_KEY = "vaquitas:travel-library:v1";
export const TRIP_LIBRARY_EVENT = "vaquitas:travel-library-updated";
const MAX_LIBRARY_BOOKS = 24;

export type SavedTripCover = {
  id: string;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: number;
  lastOpenedAt: number;
  visualTheme?: TripVisualTheme;
  coverImage?: DestinationImage;
};

function optionalString(value: unknown, max = 240): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function safeHttpsUrl(
  value: unknown,
  allowedHostname: string,
  max = 1_200
): string | null {
  const raw = optionalString(value, max);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === allowedHostname
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function validCoverImage(value: unknown): DestinationImage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const src = safeHttpsUrl(record.src, "upload.wikimedia.org");
  const sourceUrl = safeHttpsUrl(record.sourceUrl, "commons.wikimedia.org");
  const alt = optionalString(record.alt, 180);
  const credit = optionalString(record.credit, 160);
  const license = optionalString(record.license, 80);
  if (!src || !sourceUrl || !alt || !credit || !license) return null;
  return { src, sourceUrl, alt, credit, license };
}

function validCover(value: unknown): SavedTripCover | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = optionalString(record.id, 64);
  const title = optionalString(record.title, 220);
  const destination = optionalString(record.destination, 180);
  const createdAt = Number(record.createdAt);
  const lastOpenedAt = Number(record.lastOpenedAt);
  const coverImage = validCoverImage(record.coverImage);
  if (
    !id ||
    !/^[A-Za-z0-9_-]+$/.test(id) ||
    !title ||
    !destination ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(lastOpenedAt)
  ) {
    return null;
  }
  return {
    id,
    title,
    destination,
    startDate: optionalString(record.startDate, 40),
    endDate: optionalString(record.endDate, 40),
    createdAt,
    lastOpenedAt,
    ...(record.visualTheme && typeof record.visualTheme === "object"
      ? { visualTheme: record.visualTheme as TripVisualTheme }
      : {}),
    ...(coverImage ? { coverImage } : {}),
  };
}

export function parseTripLibrary(raw: string | null): SavedTripCover[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(validCover)
      .filter((item): item is SavedTripCover => Boolean(item))
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, MAX_LIBRARY_BOOKS);
  } catch {
    return [];
  }
}

export function rememberTripCover(
  current: SavedTripCover[],
  cover: SavedTripCover
): SavedTripCover[] {
  const previous = current.find((item) => item.id === cover.id);
  const nextCover =
    cover.coverImage || !previous?.coverImage
      ? cover
      : { ...cover, coverImage: previous.coverImage };
  return [nextCover, ...current.filter((item) => item.id !== cover.id)]
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, MAX_LIBRARY_BOOKS);
}
