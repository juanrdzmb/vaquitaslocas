import type { Coordinates, Recommendation } from "./schema";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  importance?: number;
};

function normalizedTokens(value: string): string[] {
  const ignored = new Set([
    "the", "and", "del", "las", "los", "una", "uno", "cafe", "café",
    "restaurant", "restaurante", "hotel",
  ]);
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:praha|prague)\b/g, "praga")
    .replace(/\b(?:czechia|czech|cesko|chequia)\b/g, "checa")
    .replace(/\bmagyarorszag\b/g, "hungria")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

export function geocodeResultMatches(
  expectedName: string,
  expectedLocation: string,
  displayName: string
): boolean {
  const haystack = new Set(normalizedTokens(displayName));
  const nameTokens = [...new Set(normalizedTokens(expectedName))];
  const locationTokens = [...new Set(normalizedTokens(expectedLocation))];
  const nameMatches = nameTokens.filter((token) => haystack.has(token)).length;
  const locationMatches = locationTokens.filter((token) => haystack.has(token)).length;
  const requiredNameMatches = nameTokens.length <= 1 ? 1 : 2;
  return (
    nameTokens.length > 0 &&
    nameMatches >= requiredNameMatches &&
    (locationTokens.length === 0 || locationMatches >= 1)
  );
}

async function geocodeResults(query: string, limit = 1): Promise<NominatimResult[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 5))));
  url.searchParams.set("addressdetails", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "VaquitasLocas/2.0 (travel itinerary geocoding)",
        "Accept-Language": "es,en",
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: controller.signal,
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) return [];
  return (await res.json()) as NominatimResult[];
}

function coordinatesFromResult(result: NominatimResult | undefined): Coordinates | null {
  if (!result) return null;
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return {
    lat,
    lng,
  };
}

export async function geocode(query: string): Promise<Coordinates | null> {
  return coordinatesFromResult((await geocodeResults(query, 1))[0]);
}

/** Solo certifica un negocio si Nominatim devuelve nombre y localidad compatibles. */
export async function geocodeVerifiedPlace(
  name: string,
  location: string
): Promise<Coordinates | null> {
  const candidates = await geocodeResults(`${name}, ${location}`, 5);
  const match = candidates
    .filter((candidate) => geocodeResultMatches(name, location, candidate.display_name || candidate.name || ""))
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))[0];
  return coordinatesFromResult(match);
}

export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  type: Recommendation["type"];
  coordinates: Coordinates;
  tags: string[];
};

const OVERPASS_CATEGORY_MAP: Array<{
  key: string;
  values: string[];
  type: Recommendation["type"];
  label: string;
}> = [
  {
    key: "amenity",
    values: ["restaurant", "cafe", "bar", "biergarten", "fast_food"],
    type: "restaurant",
    label: "Dónde comer",
  },
  {
    key: "shop",
    values: ["books"],
    type: "bookstore",
    label: "Librería",
  },
  {
    key: "amenity",
    values: ["library"],
    type: "library",
    label: "Biblioteca",
  },
  {
    key: "tourism",
    values: ["viewpoint", "artwork", "gallery", "museum"],
    type: "culture",
    label: "Cultura",
  },
  {
    key: "tourism",
    values: ["attraction"],
    type: "hidden_gem",
    label: "Atracción",
  },
];

type OverpassElement = {
  id: number;
  type: "node" | "way";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function findNearbyPlaces(
  center: Coordinates,
  radiusMeters = 1500
): Promise<NearbyPlace[]> {
  const filters = OVERPASS_CATEGORY_MAP.map(
    (c) => `node["${c.key}"~"^(${c.values.join("|")})$"](around:${radiusMeters},${center.lat},${center.lng});`
  ).join("");

  const query = `[out:json][timeout:25];(${filters});out center 40;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { elements: OverpassElement[] };

  const places: NearbyPlace[] = [];
  const seen = new Set<string>();

  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const tags = el.tags ?? {};
    const name = tags.name || tags["name:es"] || tags.brand;
    if (!name) continue;

    let type: Recommendation["type"] = "other";
    let category = "Lugar";
    for (const c of OVERPASS_CATEGORY_MAP) {
      if (c.values.includes(tags[c.key])) {
        type = c.type;
        category = c.label;
        break;
      }
    }

    const key = `${name}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    places.push({
      id: `osm-${el.id}`,
      name,
      category,
      type,
      coordinates: { lat, lng },
      tags: [
        tags.cuisine,
        tags["cuisine:es"],
        tags.shop,
        tags.amenity,
        tags.tourism,
      ].filter((t): t is string => Boolean(t) && t !== name),
    });
  }

  return places.slice(0, 30);
}
