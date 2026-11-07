import { json, methodNotAllowed } from "../../_lib/http.js";
import { trafficQuality } from "../../_lib/trafficQuality.js";

const EVENT_NAMES = new Set([
  "catalogue_view", "catalogue_filter_applied", "catalogue_search_shared", "catalogue_more_loaded",
  "listing_view", "listing_open", "whatsapp_click", "share_property", "copy_posting",
  "media_open", "photo_view", "photo_share", "inquiry_started", "inquiry_step_completed",
  "inquiry_submitted", "inquiry_whatsapp_click", "session_engaged",
]);
const CODE_PATTERN = /^(WTS|WTL)[A-Z0-9-]+$/;
const SESSION_PATTERN = /^[a-z0-9-]{8,80}$/i;
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;
const INTENTS = new Set(["", "WTL", "WTS", "rent", "buy"]);
const MAX_BODY_BYTES = 8192;

async function boundedBody(request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0, result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return result + decoder.decode();
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
      result += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

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
  try {
    const raw = await boundedBody(context.request);
    if (raw === null) return json({ error: "Analytics event is too large." }, 413);
    payload = JSON.parse(raw);
  } catch { return json({ error: "Invalid request." }, 400); }
  const eventName = text(payload?.eventName, 40);
  const sessionId = text(payload?.sessionId, 80);
  const source = text(payload?.source, 64).toLowerCase();
  const pagePath = text(payload?.pagePath, 240);
  const listingCode = text(payload?.listingCode, 32).toUpperCase();
  const intent = text(payload?.intent, 8);
  if (!EVENT_NAMES.has(eventName) || !SESSION_PATTERN.test(sessionId) || !pagePath.startsWith("/")
    || (source && (!SOURCE_PATTERN.test(source) || /^\d{7,}$/.test(source) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(source))) || (listingCode && !CODE_PATTERN.test(listingCode)) || !INTENTS.has(intent)) {
    return json({ error: "Invalid analytics event." }, 400);
  }
  try {
    const url = new URL(context.request.url);
    const properties = safeProperties(payload?.properties);
    for (const key of Object.keys(properties)) if (key.startsWith("traffic_") || key.startsWith("quality_")) delete properties[key];
    if (eventName === "session_engaged" && (!Number.isInteger(properties.active_ms) || properties.active_ms < 10000
      || properties.active_ms > 86400000 || properties.interacted !== true || /^\/admin(?:\/|$)/i.test(pagePath))) {
      return json({ error: "Invalid engagement event." }, 400);
    }
    const quality = trafficQuality(context.request, payload);
    Object.assign(properties, quality);
    if (eventName === "session_engaged") properties.quality_engaged = quality.quality_bot ? 0 : 1;
    for (const key of ["medium", "campaign", "content", "method"]) {
      const value = text(payload?.attribution?.[key], 64).toLowerCase();
      if (SOURCE_PATTERN.test(value) && !/^\d{7,}$/.test(value)) properties[`traffic_${key}`] = value;
    }
    await context.env.REQUIREMENTS_DB.prepare(`
      INSERT INTO analytics_events (
        id, event_name, occurred_at, site_host, page_path, session_id,
        source, listing_code, intent, properties_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), eventName, new Date().toISOString(), url.hostname, pagePath,
      sessionId, source, listingCode, intent, JSON.stringify(properties),
    ).run();
    return new Response(null, { status: 204 });
  } catch {
    return json({ recorded: false }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");

