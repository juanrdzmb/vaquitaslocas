-- Esquema de base de datos para VaquitasLocas
-- Vercel Postgres crea la tabla automáticamente al primer uso
-- (la función ensureSchema() en lib/db.ts ejecuta este CREATE IF NOT EXISTS).
-- Lo dejo aquí por si prefieres crearla a mano desde el SQL editor de Vercel.

CREATE TABLE IF NOT EXISTS trips (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  subtitle        TEXT NOT NULL DEFAULT '',
  destination     TEXT NOT NULL DEFAULT '',
  start_date      TEXT,
  end_date        TEXT,
  travelers       INTEGER NOT NULL DEFAULT 1,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  overview        TEXT NOT NULL DEFAULT '',
  highlights      JSONB NOT NULL DEFAULT '[]',
  tips            JSONB NOT NULL DEFAULT '[]',
  itinerary       JSONB NOT NULL DEFAULT '[]',
  budget          JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  transport       JSONB NOT NULL DEFAULT '[]',
  hotels          JSONB NOT NULL DEFAULT '[]',
  map_center      JSONB,
  created_at      BIGINT NOT NULL
);

-- Índice opcional para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS trips_created_at_idx ON trips (created_at DESC);
