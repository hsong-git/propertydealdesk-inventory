import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { analyticsPeriod } from "../../_lib/analyticsPeriod.js";
import { cloudflareReferrerSnapshots } from "../../_data/cloudflareReferrers.js";
import { LISTING_INTEREST_SQL } from "../../_lib/listingInterest.js";

const PERIODS = new Map([[7, "-7 days"], [30, "-30 days"], [90, "-90 days"]]);

// One attribution row per session, including sessions that only visit a listing.
// Old events may have blank sources before a later tagged event; use the first
// known source in that case, without counting the session in multiple groups.
const SOURCE_SESSIONS = `WITH scoped AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY site_host, session_id
    ORDER BY CASE WHEN source = '' THEN 1 ELSE 0 END, occurred_at, id) AS attribution_rank
  FROM analytics_events WHERE occurred_at >= ?1 AND occurred_at <= ?2
), attributed AS (
  SELECT site_host, session_id, CASE WHEN source = '' THEN 'unattributed' ELSE source END AS source,
    COALESCE(json_extract(properties_json, '$.traffic_medium'), '') AS medium,
    COALESCE(json_extract(properties_json, '$.traffic_campaign'), '') AS campaign,
    COALESCE(json_extract(properties_json, '$.traffic_content'), '') AS content,
    COALESCE(json_extract(properties_json, '$.traffic_method'), '') AS method
  FROM scoped WHERE attribution_rank = 1
), metrics AS (
  SELECT site_host, session_id,
    SUM(CASE WHEN event_name = 'listing_view' THEN 1 ELSE 0 END) AS listing_views,
    SUM(CASE WHEN event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
    SUM(CASE WHEN event_name = 'inquiry_submitted' THEN 1 ELSE 0 END) AS inquiries
  FROM scoped GROUP BY site_host, session_id
)`;
const SOURCE_COUNTS = `COUNT(*) AS sessions, SUM(m.listing_views) AS listing_views,
  SUM(m.whatsapp_clicks) AS whatsapp_clicks, SUM(m.inquiries) AS inquiries,
  SUM(CASE WHEN a.method IN ('referrer', 'app_referrer', 'server_referrer') THEN 1 ELSE 0 END) AS referrer_sessions,
  SUM(CASE WHEN a.method = 'tag' THEN 1 ELSE 0 END) AS tagged_sessions`;
const SOURCE_JOIN = `FROM attributed a JOIN metrics m ON a.site_host = m.site_host AND a.session_id = m.session_id`;

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env.REQUIREMENTS_DB) return json({ error: "Analytics database is not configured." }, 503);
  const requestedDays = Number(new URL(context.request.url).searchParams.get("days")) || 30;
  const days = PERIODS.has(requestedDays) ? requestedDays : 30;
  const period = analyticsPeriod(days);
  try {
    const db = context.env.REQUIREMENTS_DB;
    const [summary, funnel, sources, postingTracking, listings, daily, campaigns, listingSources, listingInterest, postingDaily] = await Promise.all([
      db.prepare(`SELECT site_host, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ? GROUP BY site_host ORDER BY site_host`).bind(period.start, period.end).all(),
      db.prepare(`SELECT site_host, event_name, COUNT(*) AS count, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ? GROUP BY site_host, event_name ORDER BY site_host, count DESC`).bind(period.start, period.end).all(),
      db.prepare(`${SOURCE_SESSIONS} SELECT a.site_host, a.source, ${SOURCE_COUNTS} ${SOURCE_JOIN} GROUP BY a.site_host, a.source ORDER BY sessions DESC`).bind(period.start, period.end).all(),
      db.prepare(`${SOURCE_SESSIONS} SELECT a.site_host, a.source, ${SOURCE_COUNTS} ${SOURCE_JOIN}
        WHERE a.method = 'tag' AND a.source IN ('whatsapp', 'facebook', 'iproperty', 'mudah')
        GROUP BY a.site_host, a.source ORDER BY a.source`).bind(period.start, period.end).all(),
      db.prepare(`SELECT site_host, listing_code, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions FROM analytics_events WHERE event_name = 'listing_view' AND listing_code != '' AND occurred_at >= ? AND occurred_at <= ? GROUP BY site_host, listing_code ORDER BY views DESC, site_host, listing_code LIMIT 30`).bind(period.start, period.end).all(),
      db.prepare(`SELECT date(occurred_at, '+8 hours') AS day, site_host,
        COUNT(DISTINCT session_id) AS sessions,
        SUM(CASE WHEN event_name = 'listing_view' THEN 1 ELSE 0 END) AS listing_views,
        SUM(CASE WHEN event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
        SUM(CASE WHEN event_name = 'inquiry_submitted' THEN 1 ELSE 0 END) AS inquiries
        FROM analytics_events WHERE occurred_at >= ? AND occurred_at <= ?
        GROUP BY day, site_host ORDER BY day ASC`).bind(period.start, period.end).all(),
      db.prepare(`${SOURCE_SESSIONS} SELECT a.site_host, a.source, a.medium, a.campaign, a.content,
        ${SOURCE_COUNTS} ${SOURCE_JOIN} WHERE a.campaign != ''
        GROUP BY a.site_host, a.source, a.medium, a.campaign, a.content ORDER BY sessions DESC`).bind(period.start, period.end).all(),
      db.prepare(`${SOURCE_SESSIONS}, top_listings AS (
        SELECT site_host, listing_code FROM scoped
        WHERE event_name = 'listing_view' AND listing_code != ''
        GROUP BY site_host, listing_code ORDER BY COUNT(*) DESC, site_host, listing_code LIMIT 30
      ) SELECT e.site_host, e.listing_code, a.source, a.method AS attribution_method, COUNT(*) AS views,
        COUNT(DISTINCT e.session_id) AS sessions FROM scoped e
        JOIN attributed a ON e.site_host = a.site_host AND e.session_id = a.session_id
        JOIN top_listings t ON e.site_host = t.site_host AND e.listing_code = t.listing_code
        WHERE e.event_name = 'listing_view'
        GROUP BY e.site_host, e.listing_code, a.source, a.method
        ORDER BY views DESC, e.site_host, e.listing_code, a.source, a.method`).bind(period.start, period.end).all(),
      db.prepare(LISTING_INTEREST_SQL).bind(period.start, period.end).all(),
      db.prepare(`${SOURCE_SESSIONS} SELECT e.site_host, a.source, date(e.occurred_at, '+8 hours') AS day,
        COUNT(DISTINCT e.session_id) AS sessions,
        SUM(CASE WHEN e.event_name = 'listing_view' THEN 1 ELSE 0 END) AS listing_views,
        SUM(CASE WHEN e.event_name = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
        SUM(CASE WHEN e.event_name = 'inquiry_submitted' THEN 1 ELSE 0 END) AS inquiries
        FROM scoped e JOIN attributed a ON e.site_host = a.site_host AND e.session_id = a.session_id
        WHERE a.method = 'tag' AND a.source IN ('whatsapp', 'facebook', 'iproperty', 'mudah')
        GROUP BY e.site_host, a.source, day ORDER BY day, e.site_host, a.source`).bind(period.start, period.end).all(),
    ]);
    return json({ days, period, cloudflareSnapshots: cloudflareReferrerSnapshots, summary: summary.results || [], funnel: funnel.results || [], sources: sources.results || [], postingTracking: postingTracking.results || [], postingDaily: postingDaily.results || [], campaigns: campaigns.results || [], listings: listings.results || [], listingSources: listingSources.results || [], listingInterest: listingInterest.results || [], daily: daily.results || [] });
  } catch {
    return json({ error: "Analytics reporting is temporarily unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");

