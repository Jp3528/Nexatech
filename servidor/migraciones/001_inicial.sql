-- Additive, isolated from all existing Nexo tables. Never runs automatically at startup.
CREATE SCHEMA IF NOT EXISTS casaviva;
CREATE TABLE IF NOT EXISTS casaviva.migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
-- Transactional aggregate for the small initial catalog. Split into entity repositories
-- before a large catalog; FOR UPDATE guarantees inventory/order atomicity meanwhile.
CREATE TABLE IF NOT EXISTS casaviva.store (
 id integer PRIMARY KEY CHECK (id = 1),
 data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
 demo boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS casaviva.sessions (
 token_hash text PRIMARY KEY,
 user_id text,
 guest_key text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON casaviva.sessions (expires_at);
CREATE INDEX IF NOT EXISTS sessions_user ON casaviva.sessions (user_id);
CREATE TABLE IF NOT EXISTS casaviva.rate_limits (
 key text PRIMARY KEY,
 count integer NOT NULL,
 expires_at timestamptz NOT NULL
);
INSERT INTO casaviva.migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
