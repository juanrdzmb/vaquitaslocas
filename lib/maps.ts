import type { Coordinates, Recommendation } from "./schema";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
};

export async function geocode(query: string): Promise<Coordinates | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
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
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
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
