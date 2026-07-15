import { NextResponse } from "next/server";
import { findNearbyPlaces } from "@/lib/maps";
import { clientAddress, takeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const limit = takeRateLimit(`places:${clientAddress(request)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas seguidas. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const hasCoordinates = searchParams.has("lat") && searchParams.has("lng");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const rawRadius = searchParams.has("radius")
    ? Number(searchParams.get("radius"))
    : 1500;

  if (
    !hasCoordinates ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    !Number.isFinite(rawRadius)
  ) {
    return NextResponse.json(
      { error: "Lat/lng inválidos" },
      { status: 400 }
    );
  }
  const radius = Math.min(Math.max(Math.round(rawRadius), 200), 5000);

  try {
    const places = await findNearbyPlaces({ lat, lng }, radius);
    return NextResponse.json(places);
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar OpenStreetMap" },
      { status: 502 }
    );
  }
}
