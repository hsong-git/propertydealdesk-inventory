-- Historical events remain ungrouped; do not infer identities from browser details.
ALTER TABLE photo_share_events ADD COLUMN anonymous_browser_id TEXT;
CREATE INDEX IF NOT EXISTS idx_photo_share_events_anonymous_browser
  ON photo_share_events (anonymous_browser_id, shared_at DESC);
