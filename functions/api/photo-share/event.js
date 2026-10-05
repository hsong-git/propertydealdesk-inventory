import { json, methodNotAllowed } from "../../_lib/http.js";

const CODE_PATTERN = /^(WTS|WTL)[A-Z0-9-]+$/;
const CLIENTS = new Set(["native", "download", "app", "web"]);
const ANONYMOUS_VISITOR_ID = "anonymous-photo-visitor";

export async function onRequestPost(context) {
  const origin = context.request.headers.get("origin");
  if (origin && origin !== new URL(context.request.url).origin) return json({ error: "Request rejected." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const code = String(payload?.code || "").trim().toUpperCase();
  const photoCount = Number(payload?.photoCount);
  const client = String(payload?.client || "").trim().toLowerCase();
  if (!CODE_PATTERN.test(code) || !Number.isInteger(photoCount) || photoCount < 1 || photoCount > 100 || !CLIENTS.has(client)) return json({ error: "Invalid sharing event." }, 400);
  try {
    const db = context.env.REQUIREMENTS_DB;
    const sharedAt = new Date().toISOString();
    // Never associate new events with a previously registered browser's identity.
    // Batch the anonymous visitor and event so the foreign key is always valid.
    await db.batch([
      db.prepare("INSERT INTO photo_download_visitors (id, name, email, contact_number, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at")
        .bind(ANONYMOUS_VISITOR_ID, "Anonymous", "", "", sharedAt, sharedAt),
      db.prepare("INSERT INTO photo_share_events (id, visitor_id, listing_code, photo_count, share_client, shared_at, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), ANONYMOUS_VISITOR_ID, code, photoCount, client, sharedAt, (context.request.headers.get("user-agent") || "").slice(0, 300)),
    ]);
    return json({ recorded: true });
  } catch {
    return json({ error: "Photo sharing audit is unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : methodNotAllowed("POST");
