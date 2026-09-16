ALTER TABLE casaviva.records
  DROP CONSTRAINT IF EXISTS records_kind_check;

ALTER TABLE casaviva.records
  ADD CONSTRAINT records_kind_check
  CHECK (
    kind IN (
      'products',
      'rooms',
      'coupons',
      'users',
      'orders',
      'subscriptions',
      'credentials',
      'carts',
      'favorites',
      'resets'
    )
  );

CREATE INDEX IF NOT EXISTS room_slug
  ON casaviva.records ((data->>'slug'))
  WHERE kind = 'rooms';

INSERT INTO casaviva.migrations(version) VALUES(4) ON CONFLICT DO NOTHING;
