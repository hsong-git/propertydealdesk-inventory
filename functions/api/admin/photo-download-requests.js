import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Administrator access required." }, 401);
  if (!context.env?.PHOTO_GRANTS_DB) return json({ requests: [] });
  const result = await context.env.PHOTO_GRANTS_DB.prepare("SELECT * FROM photo_download_requests ORDER BY created_at DESC LIMIT 200").all();
  return json({ requests: result.results || [] });
}

export const onRequest = (context) => context.request.method === "GET" ? onRequestGet(context) : methodNotAllowed("GET");
