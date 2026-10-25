// Existing events only: no personal identities or inferred acquisition sources.
export const LISTING_INTEREST_SQL = `WITH scoped AS (
  SELECT site_host, listing_code, session_id, event_name, occurred_at, properties_json
  FROM analytics_events WHERE occurred_at >= ?1 AND occurred_at <= ?2
), top_listings AS (
  SELECT site_host, listing_code FROM scoped
  WHERE event_name = 'listing_view' AND listing_code != ''
  GROUP BY site_host, listing_code ORDER BY COUNT(*) DESC, site_host, listing_code LIMIT 30
), actions AS (
  SELECT e.site_host, e.listing_code,
    SUM(e.event_name = 'whatsapp_click') AS whatsapp_clicks,
    SUM(e.event_name = 'photo_view') AS photo_opens,
    SUM(CASE WHEN e.event_name = 'media_open' AND json_extract(e.properties_json, '$.media') = 'layout' THEN 1 ELSE 0 END) AS layout_opens,
    SUM(CASE WHEN e.event_name = 'media_open' AND json_extract(e.properties_json, '$.media') = 'videos' THEN 1 ELSE 0 END) AS video_opens,
    SUM(e.event_name = 'photo_share') AS photo_shares,
    SUM(e.event_name = 'copy_posting') AS posting_copies,
    SUM(e.event_name = 'share_property') AS property_shares
  FROM scoped e JOIN top_listings t ON e.site_host = t.site_host AND e.listing_code = t.listing_code
  GROUP BY e.site_host, e.listing_code
), viewers AS (
  SELECT e.site_host, e.listing_code, e.session_id, MIN(e.occurred_at) AS first_view, COUNT(*) AS views
  FROM scoped e JOIN top_listings t ON e.site_host = t.site_host AND e.listing_code = t.listing_code
  WHERE e.event_name = 'listing_view' GROUP BY e.site_host, e.listing_code, e.session_id
), journeys AS (
  SELECT v.site_host, v.listing_code, v.session_id, v.views,
    MAX(CASE WHEN e.listing_code = v.listing_code AND e.event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS contacted,
    MAX(CASE WHEN e.event_name = 'inquiry_submitted' THEN 1 ELSE 0 END) AS inquired,
    MAX(CASE WHEN e.listing_code = v.listing_code AND e.event_name IN
      ('whatsapp_click','photo_view','media_open','photo_share','copy_posting','share_property') THEN 1 ELSE 0 END) AS engaged
  FROM viewers v LEFT JOIN scoped e ON e.site_host = v.site_host AND e.session_id = v.session_id
    AND e.occurred_at >= v.first_view
    AND (e.listing_code = v.listing_code OR e.event_name = 'inquiry_submitted')
  GROUP BY v.site_host, v.listing_code, v.session_id, v.views
), viewing_totals AS (
  SELECT site_host, listing_code, COUNT(*) AS viewing_sessions,
    SUM(views > 1) AS repeat_view_sessions, SUM(contacted) AS contact_sessions,
    SUM(inquired) AS inquiry_sessions, SUM(engaged) AS engaged_sessions,
    SUM(CASE WHEN engaged = 0 AND inquired = 0 THEN 1 ELSE 0 END) AS no_action_sessions
  FROM journeys GROUP BY site_host, listing_code
)
SELECT a.*, v.viewing_sessions, v.repeat_view_sessions, v.contact_sessions,
  v.inquiry_sessions, v.engaged_sessions, v.no_action_sessions
FROM actions a JOIN viewing_totals v ON a.site_host = v.site_host AND a.listing_code = v.listing_code
ORDER BY a.site_host, a.listing_code`;
