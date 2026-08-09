ALTER TABLE photo_catalogue_grants ADD COLUMN listing_code TEXT;

CREATE TABLE IF NOT EXISTS photo_download_requests (
  id TEXT PRIMARY KEY,
  listing_code TEXT NOT NULL,
  listing_slug TEXT NOT NULL,
  listing_title TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'declined')),
  created_at TEXT NOT NULL,
  granted_at TEXT,
  grant_id TEXT,
  telegram_notified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_download_requests_status ON photo_download_requests (status, created_at DESC);
