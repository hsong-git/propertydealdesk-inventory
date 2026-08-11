import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env?.REQUIREMENTS_DB) return json({ events: [] });
  try {
    const result = await context.env.REQUIREMENTS_DB.prepare(`SELECT e.id, e.listing_code, e.photo_count, e.share_client, e.shared_at, e.user_agent, v.name, v.email, v.contact_number FROM photo_share_events e JOIN photo_download_visitors v ON v.id = e.visitor_id ORDER BY e.shared_at DESC LIMIT 500`).all();
    return json({ events: result.results || [] });
  } catch {
    return json({ events: [], error: "Photo sharing audit is not configured yet." }, 503);
  }
}

export async function onRequestDelete(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env?.REQUIREMENTS_DB) return json({ deleted: 0 });
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const name = String(payload?.name || "").trim();
  if (!name || name.length > 120) return json({ error: "A valid visitor name is required." }, 400);
  try {
    const result = await context.env.REQUIREMENTS_DB.prepare(`DELETE FROM photo_share_events WHERE visitor_id IN (SELECT id FROM photo_download_visitors WHERE UPPER(TRIM(name)) = UPPER(TRIM(?)))`).bind(name).run();
    return json({ deleted: Number(result?.meta?.changes || 0) });
  } catch {
    return json({ error: "Photo sharing audit is unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : context.request.method === "DELETE"
    ? onRequestDelete(context)
    : methodNotAllowed("GET, DELETE");
