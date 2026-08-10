CREATE TABLE IF NOT EXISTS listing_view_events (
  id TEXT PRIMARY KEY,
  listing_code TEXT NOT NULL,
  viewed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_view_events_time ON listing_view_events (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_view_events_listing ON listing_view_events (listing_code, viewed_at DESC);
