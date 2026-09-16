CREATE TABLE IF NOT EXISTS casaviva.mail_outbox (
  key text PRIMARY KEY,
  message jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_pending ON casaviva.mail_outbox(available_at) WHERE sent_at IS NULL;
INSERT INTO casaviva.migrations(version) VALUES(3) ON CONFLICT DO NOTHING;
