import { NextResponse } from "next/server";
import { findNearbyPlaces } from "@/lib/maps";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = Math.min(
    Math.max(parseInt(searchParams.get("radius") ?? "1500", 10), 200),
    5000
  );

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "Lat/lng inválidos" },
      { status: 400 }
    );
  }

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
