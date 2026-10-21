-- Privacy-conscious product analytics. Session IDs are temporary browser-session
-- identifiers; no IP address, email, phone number, or fingerprint is stored.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  site_host TEXT NOT NULL,
  page_path TEXT NOT NULL,
  session_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  listing_code TEXT NOT NULL DEFAULT '',
  intent TEXT NOT NULL DEFAULT '',
  properties_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_time
  ON analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_site_event
  ON analytics_events (site_host, event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id, occurred_at ASC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing
  ON analytics_events (listing_code, occurred_at DESC);

