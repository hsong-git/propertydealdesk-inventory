CREATE TABLE IF NOT EXISTS shared_search_links (
  id TEXT PRIMARY KEY,
  site_host TEXT NOT NULL,
  search_query TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shared_search_host_created ON shared_search_links(site_host, created_at);
