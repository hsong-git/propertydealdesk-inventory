import { json, methodNotAllowed } from "../../_lib/http.js";

const EVENT_NAMES = new Set([
  "catalogue_view", "catalogue_filter_applied", "catalogue_search_shared", "catalogue_more_loaded",
  "listing_view", "listing_open", "whatsapp_click", "share_property", "copy_posting",
  "media_open", "photo_view", "photo_share", "inquiry_started", "inquiry_step_completed",
  "inquiry_submitted", "inquiry_whatsapp_click",
]);
const CODE_PATTERN = /^(WTS|WTL)[A-Z0-9-]+$/;
const SESSION_PATTERN = /^[a-z0-9-]{8,80}$/i;
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const INTENTS = new Set(["", "WTL", "WTS", "rent", "buy"]);

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function safeProperties(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result = {};
  for (const [key, value] of Object.entries(raw).slice(0, 12)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/i.test(key)) continue;
    if (typeof value === "string") result[key] = value.slice(0, 120);
    else if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    else if (typeof value === "boolean") result[key] = value;
    else if (Array.isArray(value)) result[key] = value.slice(0, 12).map((item) => String(item).slice(0, 80));
  }
  return result;
}

export async function onRequestPost(context) {
  const origin = context.request.headers.get("origin");
  if (origin && origin !== new URL(context.request.url).origin) return json({ error: "Request rejected." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const eventName = text(payload?.eventName, 40);
  const sessionId = text(payload?.sessionId, 80);
  const source = text(payload?.source, 64).toLowerCase();
  const pagePath = text(payload?.pagePath, 240);
  const listingCode = text(payload?.listingCode, 32).toUpperCase();
  const intent = text(payload?.intent, 8);
  if (!EVENT_NAMES.has(eventName) || !SESSION_PATTERN.test(sessionId) || !pagePath.startsWith("/")
    || (source && !SOURCE_PATTERN.test(source)) || (listingCode && !CODE_PATTERN.test(listingCode)) || !INTENTS.has(intent)) {
    return json({ error: "Invalid analytics event." }, 400);
  }
  try {
    const url = new URL(context.request.url);
    await context.env.REQUIREMENTS_DB.prepare(`
      INSERT INTO analytics_events (
        id, event_name, occurred_at, site_host, page_path, session_id,
        source, listing_code, intent, properties_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), eventName, new Date().toISOString(), url.hostname, pagePath,
      sessionId, source, listingCode, intent, JSON.stringify(safeProperties(payload?.properties)),
    ).run();
    return new Response(null, { status: 204 });
  } catch {
    return json({ recorded: false }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");

