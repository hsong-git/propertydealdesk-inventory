CREATE TABLE IF NOT EXISTS photo_catalogue_grants (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope = 'catalogue'),
  recipient_email TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  first_access_at TEXT,
  active_expires_at TEXT,
  inventory_version TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_photo_catalogue_grants_active
  ON photo_catalogue_grants (recipient_email, revoked_at, absolute_expires_at);

CREATE TABLE IF NOT EXISTS photo_catalogue_sessions (
  session_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES photo_catalogue_grants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_catalogue_sessions_grant
  ON photo_catalogue_sessions (grant_id, expires_at);
