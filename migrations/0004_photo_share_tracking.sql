CREATE TABLE IF NOT EXISTS photo_share_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES photo_download_visitors(id) ON DELETE CASCADE,
  listing_code TEXT NOT NULL,
  photo_count INTEGER NOT NULL,
  share_client TEXT NOT NULL,
  shared_at TEXT NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_share_events_time ON photo_share_events (shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_share_events_listing ON photo_share_events (listing_code, shared_at DESC);
