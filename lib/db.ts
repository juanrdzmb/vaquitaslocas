import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { nanoid } from "nanoid";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Trip, TripVisualTheme } from "./schema";

const databaseUrl =
  process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || null;
const allowLocalFallback =
  process.env.NODE_ENV === "development" && !process.env.VERCEL;
const LOCAL_DB_DIR = path.join(process.cwd(), "local-db");
const TRIP_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type SqlClient = NeonQueryFunction<false, false>;

let sqlClient: SqlClient | null = null;
let schemaReady: Promise<void> | null = null;

export async function createTrip(
  data: Omit<Trip, "id" | "createdAt">
): Promise<Trip> {
  const id = nanoid(10);
  const createdAt = Date.now();
  const trip: Trip = { ...data, id, createdAt };

  if (databaseUrl) {
    await createTripPostgres(trip);
  } else if (allowLocalFallback) {
    await createTripLocal(trip);
  } else {
    throw missingDatabaseError();
  }

  return trip;
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (!TRIP_ID_PATTERN.test(id)) return null;

  if (databaseUrl) {
    return getTripPostgres(id);
  }
  if (allowLocalFallback) {
    return getTripLocal(id);
  }
  throw missingDatabaseError();
}

// ─── Neon Postgres (producción) ─────────────────────────────

function getSqlClient(): SqlClient {
  if (!databaseUrl) throw missingDatabaseError();
  if (!sqlClient) sqlClient = neon(databaseUrl);
  return sqlClient;
}

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;

  const sql = getSqlClient();
  schemaReady = initializeSchema(sql).catch((error) => {
    // Permite reintentar después de un fallo transitorio de Neon.
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function initializeSchema(sql: SqlClient): Promise<void> {
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
      highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
      tips JSONB NOT NULL DEFAULT '[]'::jsonb,
      itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
      budget JSONB NOT NULL DEFAULT '[]'::jsonb,
      recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
      transport JSONB NOT NULL DEFAULT '[]'::jsonb,
      hotels JSONB NOT NULL DEFAULT '[]'::jsonb,
      map_center JSONB,
      visual_theme JSONB,
      source_file_name TEXT,
      source_sheet_count INTEGER,
      created_at BIGINT NOT NULL
    )
  `;

  // CREATE TABLE IF NOT EXISTS no migra tablas creadas por versiones anteriores.
  await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS visual_theme JSONB`;
  await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_file_name TEXT`;
  await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_sheet_count INTEGER`;
  await sql`CREATE INDEX IF NOT EXISTS trips_created_at_idx ON trips (created_at DESC)`;
}

async function createTripPostgres(trip: Trip): Promise<void> {
  await ensureSchema();
  const sql = getSqlClient();

  await sql`
    INSERT INTO trips (
      id, title, subtitle, destination, start_date, end_date,
      travelers, currency, overview, highlights, tips,
      itinerary, budget, recommendations, transport, hotels, map_center,
      visual_theme, source_file_name, source_sheet_count, created_at
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
      ${trip.visualTheme ? JSON.stringify(trip.visualTheme) : null}::jsonb,
      ${trip.sourceFileName ?? null},
      ${normalizeSheetCount(trip.sourceSheetCount)},
      ${trip.createdAt}
    )
  `;
}

async function getTripPostgres(id: string): Promise<Trip | null> {
  await ensureSchema();
  const sql = getSqlClient();
  const rows = await sql`SELECT * FROM trips WHERE id = ${id} LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;

  return row ? mapTripRow(row) : null;
}

function mapTripRow(row: Record<string, unknown>): Trip {
  const visualTheme = parseJsonObject<TripVisualTheme>(row.visual_theme);
  const sourceFileName = optionalString(row.source_file_name);

  return {
    id: String(row.id),
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
    destination: String(row.destination ?? ""),
    startDate: optionalString(row.start_date) ?? null,
    endDate: optionalString(row.end_date) ?? null,
    travelers: Number(row.travelers ?? 1) || 1,
    currency: String(row.currency ?? "EUR"),
    overview: String(row.overview ?? ""),
    highlights: parseJsonArray(row.highlights),
    tips: parseJsonArray(row.tips),
    itinerary: parseJsonArray(row.itinerary),
    budget: parseJsonArray(row.budget),
    recommendations: parseJsonArray(row.recommendations),
    transport: parseJsonArray(row.transport),
    hotels: parseJsonArray(row.hotels),
    mapCenter: parseJsonObject<Trip["mapCenter"]>(row.map_center) ?? null,
    ...(visualTheme ? { visualTheme } : {}),
    ...(sourceFileName ? { sourceFileName } : {}),
    // Las filas creadas antes de esta columna se leen como un libro sin hojas conocidas.
    sourceSheetCount: normalizeSheetCount(row.source_sheet_count) ?? 0,
    createdAt: Number(row.created_at ?? Date.now()),
  };
}

// ─── Local: archivos JSON (solo desarrollo) ─────────────────

async function ensureLocalDir(): Promise<void> {
  await fs.mkdir(LOCAL_DB_DIR, { recursive: true });
}

async function createTripLocal(trip: Trip): Promise<void> {
  await ensureLocalDir();
  const filePath = path.join(LOCAL_DB_DIR, `${trip.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(trip, null, 2), "utf-8");
}

async function getTripLocal(id: string): Promise<Trip | null> {
  const filePath = path.join(LOCAL_DB_DIR, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const trip = JSON.parse(raw) as Trip;
    return {
      ...trip,
      sourceSheetCount: normalizeSheetCount(trip.sourceSheetCount) ?? 0,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(`No se pudo leer el viaje local "${id}".`, {
      cause: error,
    });
  }
}

// ─── helpers ────────────────────────────────────────────────

function missingDatabaseError(): Error {
  return new Error(
    "Base de datos no configurada. Define DATABASE_URL (Neon) o POSTGRES_URL. " +
      "El fallback JSON solo está disponible durante el desarrollo local."
  );
}

function parseJsonArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonObject<T>(value: unknown): T | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as T)
        : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeSheetCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}
