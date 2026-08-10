import { resolvePhotoVisitorSession } from "../../_lib/grants.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

const CODE_PATTERN = /^(WTS|WTL)[A-Z0-9-]+$/;
const CLIENTS = new Set(["native", "download", "app", "web"]);

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
    const visitor = await resolvePhotoVisitorSession({ env: context.env, request: context.request });
    if (!visitor) return json({ error: "Registration required." }, 401);
    await context.env.REQUIREMENTS_DB.prepare("INSERT INTO photo_share_events (id, visitor_id, listing_code, photo_count, share_client, shared_at, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), visitor.visitor_id, code, photoCount, client, new Date().toISOString(), (context.request.headers.get("user-agent") || "").slice(0, 300)).run();
    return json({ recorded: true });
  } catch {
    return json({ error: "Photo sharing audit is unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : methodNotAllowed("POST");
