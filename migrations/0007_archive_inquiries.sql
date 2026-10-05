-- Archive separately from read/unread status; references and details are preserved.
ALTER TABLE property_requirements ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_property_requirements_archived
  ON property_requirements (archived_at, submitted_at DESC);
