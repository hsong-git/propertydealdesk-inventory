import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { analyticsPeriod } from "../../_lib/analyticsPeriod.js";

const PERIODS = new Map([[7, "-7 days"], [30, "-30 days"], [90, "-90 days"]]);

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env.REQUIREMENTS_DB) return json({ error: "Analytics database is not configured." }, 503);
  const requestedDays = Number(new URL(context.request.url).searchParams.get("days")) || 30;
  const days = PERIODS.has(requestedDays) ? requestedDays : 30;
  const period = analyticsPeriod(days);
  try {
    const db = context.env.REQUIREMENTS_DB;
    const [summary, funnel, sources, listings, daily] = await Promise.all([
      db.prepare(`SELECT site_host, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ? GROUP BY site_host ORDER BY site_host`).bind(period.start, period.end).all(),
      db.prepare(`SELECT site_host, event_name, COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ? GROUP BY site_host, event_name ORDER BY site_host, count DESC`).bind(period.start, period.end).all(),
      db.prepare(`SELECT site_host, CASE WHEN source = '' THEN 'Unattributed' ELSE source END AS source, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE event_name = 'catalogue_view' AND occurred_at >= ? AND occurred_at <= ? GROUP BY site_host, source ORDER BY sessions DESC LIMIT 30`).bind(period.start, period.end).all(),
      db.prepare(`SELECT site_host, listing_code, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE event_name = 'listing_view' AND listing_code != '' AND occurred_at >= ? AND occurred_at <= ? GROUP BY site_host, listing_code ORDER BY views DESC LIMIT 30`).bind(period.start, period.end).all(),
      db.prepare(`SELECT date(occurred_at, '+8 hours') AS day, site_host,
        COUNT(DISTINCT session_id) AS sessions,
        SUM(CASE WHEN event_name = 'listing_view' THEN 1 ELSE 0 END) AS listing_views,
        SUM(CASE WHEN event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
        SUM(CASE WHEN event_name = 'inquiry_submitted' THEN 1 ELSE 0 END) AS inquiries
        FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ?
        GROUP BY day, site_host ORDER BY day ASC`).bind(period.start, period.end).all(),
    ]);
    return json({ days, period, summary: summary.results || [], funnel: funnel.results || [], sources: sources.results || [], listings: listings.results || [], daily: daily.results || [] });
  } catch {
    return json({ error: "Analytics reporting is temporarily unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");

