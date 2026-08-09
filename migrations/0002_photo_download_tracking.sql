CREATE TABLE IF NOT EXISTS photo_download_visitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_download_visitors_email ON photo_download_visitors (email);

CREATE TABLE IF NOT EXISTS photo_download_sessions (
  token_hash TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES photo_download_visitors(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_download_sessions_expiry ON photo_download_sessions (expires_at);

CREATE TABLE IF NOT EXISTS photo_download_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES photo_download_visitors(id) ON DELETE CASCADE,
  listing_code TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_download_events_time ON photo_download_events (downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_download_events_listing ON photo_download_events (listing_code, downloaded_at DESC);
