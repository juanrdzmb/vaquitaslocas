import { nanoid } from "nanoid";
import type { Trip } from "./schema";

const hasPostgres = Boolean(process.env.POSTGRES_URL);

export async function createTrip(
  data: Omit<Trip, "id" | "createdAt">
): Promise<Trip> {
  const id = nanoid(10);
  const createdAt = Date.now();
  const trip: Trip = { ...data, id, createdAt };

  if (hasPostgres) {
    await createTripPostgres(trip);
  } else {
    await createTripLocal(trip);
  }

  return trip;
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (hasPostgres) {
    return getTripPostgres(id);
  }
  return getTripLocal(id);
}

// ─── Vercel Postgres (producción) ────────────────────────────

async function createTripPostgres(trip: Trip): Promise<void> {
  const { sql } = await import("@vercel/postgres");
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      destination TEXT NOT NULL DEFAULT '',
      start_date TEXT,
      end_date TEXT,
      travelers INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'EUR',
      overview TEXT NOT NULL DEFAULT '',
      highlights JSONB NOT NULL DEFAULT '[]',
      tips JSONB NOT NULL DEFAULT '[]',
      itinerary JSONB NOT NULL DEFAULT '[]',
      budget JSONB NOT NULL DEFAULT '[]',
      recommendations JSONB NOT NULL DEFAULT '[]',
      transport JSONB NOT NULL DEFAULT '[]',
      hotels JSONB NOT NULL DEFAULT '[]',
      map_center JSONB,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`
    INSERT INTO trips (
      id, title, subtitle, destination, start_date, end_date,
      travelers, currency, overview, highlights, tips,
      itinerary, budget, recommendations, transport, hotels, map_center, created_at
    ) VALUES (
      ${trip.id}, ${trip.title}, ${trip.subtitle}, ${trip.destination},
      ${trip.startDate}, ${trip.endDate},
      ${trip.travelers}, ${trip.currency}, ${trip.overview},
      ${JSON.stringify(trip.highlights)}::jsonb,
      ${JSON.stringify(trip.tips)}::jsonb,
      ${JSON.stringify(trip.itinerary)}::jsonb,
      ${JSON.stringify(trip.budget)}::jsonb,
      ${JSON.stringify(trip.recommendations)}::jsonb,
      ${JSON.stringify(trip.transport)}::jsonb,
      ${JSON.stringify(trip.hotels)}::jsonb,
      ${trip.mapCenter ? JSON.stringify(trip.mapCenter) : null}::jsonb,
      ${trip.createdAt}
    )
  `;
}

async function getTripPostgres(id: string): Promise<Trip | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const { rows } = await sql`
      SELECT * FROM trips WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return null;
    const r = rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      title: String(r.title),
      subtitle: String(r.subtitle ?? ""),
      destination: String(r.destination ?? ""),
      startDate: (r.start_date as string) ?? null,
      endDate: (r.end_date as string) ?? null,
      travelers: Number(r.travelers ?? 1) || 1,
      currency: String(r.currency ?? "EUR"),
      overview: String(r.overview ?? ""),
      highlights: parseJsonArray(r.highlights),
      tips: parseJsonArray(r.tips),
      itinerary: parseJsonArray(r.itinerary),
      budget: parseJsonArray(r.budget),
      recommendations: parseJsonArray(r.recommendations),
      transport: parseJsonArray(r.transport),
      hotels: parseJsonArray(r.hotels),
      mapCenter:
        (r.map_center as { lat: number; lng: number } | null) ?? null,
      createdAt: Number(r.created_at ?? Date.now()),
    };
  } catch {
    return null;
  }
}

// ─── Local: archivos JSON (desarrollo sin Postgres) ──────────

import { promises as fs } from "node:fs";
import path from "node:path";

const LOCAL_DB_DIR = path.join(process.cwd(), "local-db");

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(LOCAL_DB_DIR, { recursive: true });
}

async function createTripLocal(trip: Trip): Promise<void> {
  await ensureLocalDir();
  const filePath = path.join(LOCAL_DB_DIR, `${trip.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(trip, null, 2), "utf-8");
}

async function getTripLocal(id: string): Promise<Trip | null> {
  try {
    const filePath = path.join(LOCAL_DB_DIR, `${id}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
}

// ─── helpers ────────────────────────────────────────────────

function parseJsonArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
