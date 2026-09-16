CREATE TABLE IF NOT EXISTS casaviva.records (
 kind text NOT NULL CHECK(kind IN ('products','coupons','users','orders','subscriptions','credentials','carts','favorites','resets')),
 key text NOT NULL,
 data jsonb NOT NULL,
 position integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,key)
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_email ON casaviva.records ((lower(data->>'email'))) WHERE kind='users';
CREATE UNIQUE INDEX IF NOT EXISTS order_idempotency ON casaviva.records ((data->>'userId'),(data->>'key')) WHERE kind='orders';
CREATE INDEX IF NOT EXISTS own_orders ON casaviva.records ((data->>'userId')) WHERE kind='orders';
-- Preserve the legacy snapshot as a migration backup. It is no longer read at runtime.
INSERT INTO casaviva.records(kind,key,data,position)
SELECT k.kind, COALESCE(v.data->>'id',v.data->>'code',v.data#>>'{}'),v.data,(v.n-1)::int
FROM casaviva.store s CROSS JOIN (VALUES ('products'),('coupons'),('users'),('orders'),('subscriptions')) k(kind)
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->k.kind,'[]')) WITH ORDINALITY v(data,n)
WHERE NOT EXISTS (SELECT 1 FROM casaviva.migrations WHERE version=2) ON CONFLICT DO NOTHING;
INSERT INTO casaviva.records(kind,key,data)
SELECT k.kind,v.key,v.value FROM casaviva.store s
CROSS JOIN (VALUES ('credentials'),('carts'),('favorites'),('resets')) k(kind)
CROSS JOIN LATERAL jsonb_each(COALESCE(s.data->k.kind,'{}')) v
WHERE NOT EXISTS (SELECT 1 FROM casaviva.migrations WHERE version=2) ON CONFLICT DO NOTHING;
INSERT INTO casaviva.migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
