// Additive, per-site/tab-session flags. Historical events are not backfilled.
export const QUALITY_SESSION_METRICS = `
  MAX(CASE WHEN json_extract(properties_json, '$.quality_version') = 1 THEN 1 ELSE 0 END) AS assessed,
  MAX(CASE WHEN json_extract(properties_json, '$.quality_version') = 1 AND json_extract(properties_json, '$.quality_bot') = 1 THEN 1 ELSE 0 END) AS flagged,
  MAX(CASE WHEN json_extract(properties_json, '$.quality_version') = 1 AND event_name = 'session_engaged' AND json_extract(properties_json, '$.quality_engaged') = 1 THEN 1 ELSE 0 END) AS engaged`;
export const QUALITY_SOURCE_COUNTS = `
  SUM(CASE WHEN m.flagged = 0 AND m.engaged = 1 THEN 1 ELSE 0 END) AS engaged_sessions,
  SUM(m.flagged) AS flagged_sessions,
  SUM(CASE WHEN m.assessed = 0 THEN 1 ELSE 0 END) AS unassessed_sessions`;
export const QUALITY_SUMMARY = `SELECT m.site_host, COUNT(*) AS visits,
  SUM(m.assessed) AS assessed_sessions, ${QUALITY_SOURCE_COUNTS},
  SUM(CASE WHEN m.assessed = 1 AND m.flagged = 0 AND m.engaged = 0 THEN 1 ELSE 0 END) AS passive_sessions
  FROM metrics m GROUP BY m.site_host`;
