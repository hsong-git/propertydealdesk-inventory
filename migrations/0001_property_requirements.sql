CREATE TABLE IF NOT EXISTS requirement_counters (
  prefix TEXT PRIMARY KEY CHECK (prefix IN ('WTR', 'WTB')),
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0)
);

INSERT OR IGNORE INTO requirement_counters (prefix, value) VALUES ('WTR', 0), ('WTB', 0);

CREATE TABLE IF NOT EXISTS property_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE CHECK (reference GLOB 'WT[RB][0-9][0-9][0-9][0-9][0-9][0-9]'),
  submitted_at TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('rent', 'buy')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  area TEXT NOT NULL,
  budget REAL NOT NULL CHECK (budget > 0),
  profile_json TEXT NOT NULL,
  requirements_json TEXT NOT NULL,
  other_needs TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  consented_at TEXT NOT NULL,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_property_requirements_submitted ON property_requirements (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_requirements_status ON property_requirements (status, submitted_at DESC);
