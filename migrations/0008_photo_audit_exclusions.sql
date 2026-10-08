-- Keep only the browser hash needed to suppress future photo audit events.
-- Exclusions do not affect photo downloads or other browsers' audit entries.
CREATE TABLE IF NOT EXISTS photo_audit_excluded_browsers (
  anonymous_browser_id TEXT PRIMARY KEY
    CHECK(length(anonymous_browser_id) = 64 AND anonymous_browser_id NOT GLOB '*[^0-9a-f]*'),
  excluded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS suppress_excluded_photo_audit
BEFORE INSERT ON photo_share_events
WHEN EXISTS (
  SELECT 1 FROM photo_audit_excluded_browsers
  WHERE anonymous_browser_id = NEW.anonymous_browser_id
)
BEGIN
  SELECT RAISE(IGNORE);
END;
