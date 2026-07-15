-- Esquema de persistencia para VaquitasLocas en Neon Postgres.
-- lib/db.ts refleja estas operaciones para inicializar despliegues nuevos y
-- migrar de forma idempotente instalaciones anteriores.

CREATE TABLE IF NOT EXISTS trips (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  subtitle           TEXT NOT NULL DEFAULT '',
  destination        TEXT NOT NULL DEFAULT '',
  start_date         TEXT,
  end_date           TEXT,
  travelers          INTEGER NOT NULL DEFAULT 1,
  currency           TEXT NOT NULL DEFAULT 'EUR',
  overview           TEXT NOT NULL DEFAULT '',
  highlights         JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips               JSONB NOT NULL DEFAULT '[]'::jsonb,
  itinerary          JSONB NOT NULL DEFAULT '[]'::jsonb,
  budget             JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations    JSONB NOT NULL DEFAULT '[]'::jsonb,
  transport          JSONB NOT NULL DEFAULT '[]'::jsonb,
  hotels             JSONB NOT NULL DEFAULT '[]'::jsonb,
  map_center         JSONB,
  visual_theme       JSONB,
  source_file_name   TEXT,
  source_sheet_count INTEGER,
  source_workbook    JSONB,
  source_hash        TEXT,
  generation_version TEXT,
  created_at         BIGINT NOT NULL
);

-- CREATE TABLE IF NOT EXISTS no añade columnas a tablas que ya existían.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS visual_theme JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_sheet_count INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_workbook JSONB;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS source_hash TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS generation_version TEXT;

CREATE INDEX IF NOT EXISTS trips_created_at_idx ON trips (created_at DESC);
CREATE INDEX IF NOT EXISTS trips_generation_cache_idx
  ON trips (source_hash, generation_version, created_at DESC)
  WHERE source_hash IS NOT NULL AND generation_version IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trips_generation_fingerprint_unique_idx
  ON trips (source_hash, generation_version)
  WHERE source_hash IS NOT NULL AND generation_version IS NOT NULL;
