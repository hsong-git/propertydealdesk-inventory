import { json, methodNotAllowed } from "../_lib/http.js";

const CODE_PATTERN = /^(WTS|WTL)[A-Z0-9-]+$/;

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Request rejected." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const code = String(payload?.code || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return json({ error: "Invalid listing." }, 400);
  try {
    await context.env.REQUIREMENTS_DB.prepare("INSERT INTO listing_view_events (id, listing_code, viewed_at) VALUES (?, ?, ?)")
      .bind(crypto.randomUUID(), code, new Date().toISOString()).run();
    return json({ recorded: true });
  } catch { return json({ recorded: false }, 503); }
}

export async function onRequestGet(context) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await context.env.REQUIREMENTS_DB.prepare("SELECT listing_code, MAX(viewed_at) AS viewed_at FROM listing_view_events WHERE viewed_at >= ? GROUP BY listing_code ORDER BY viewed_at DESC LIMIT 20").bind(since).all();
    return json({ events: result.results || [] }, 200, { "cache-control": "no-store" });
  } catch { return json({ events: [] }, 503); }
}

export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : context.request.method === "GET" ? onRequestGet(context) : methodNotAllowed("GET, POST");
