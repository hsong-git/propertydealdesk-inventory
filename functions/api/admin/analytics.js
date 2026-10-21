import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

const PERIODS = new Map([[7, "-7 days"], [30, "-30 days"], [90, "-90 days"]]);

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env.REQUIREMENTS_DB) return json({ error: "Analytics database is not configured." }, 503);
  const requestedDays = Number(new URL(context.request.url).searchParams.get("days")) || 30;
  const days = PERIODS.has(requestedDays) ? requestedDays : 30;
  const modifier = PERIODS.get(days);
  try {
    const db = context.env.REQUIREMENTS_DB;
    const [summary, funnel, sources, listings, daily] = await Promise.all([
      db.prepare(`SELECT site_host, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= datetime('now', ?) GROUP BY site_host ORDER BY site_host`).bind(modifier).all(),
      db.prepare(`SELECT site_host, event_name, COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= datetime('now', ?) GROUP BY site_host, event_name ORDER BY site_host, count DESC`).bind(modifier).all(),
      db.prepare(`SELECT site_host, CASE WHEN source = '' THEN 'Unattributed' ELSE source END AS source, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE event_name = 'catalogue_view' AND occurred_at >= datetime('now', ?) GROUP BY site_host, source ORDER BY sessions DESC LIMIT 30`).bind(modifier).all(),
      db.prepare(`SELECT site_host, listing_code, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE event_name = 'listing_view' AND listing_code != '' AND occurred_at >= datetime('now', ?) GROUP BY site_host, listing_code ORDER BY views DESC LIMIT 30`).bind(modifier).all(),
      db.prepare(`SELECT substr(occurred_at, 1, 10) AS day, site_host, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= datetime('now', ?) GROUP BY day, site_host ORDER BY day ASC`).bind(modifier).all(),
    ]);
    return json({ days, summary: summary.results || [], funnel: funnel.results || [], sources: sources.results || [], listings: listings.results || [], daily: daily.results || [] });
  } catch {
    return json({ error: "Analytics reporting is temporarily unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");

