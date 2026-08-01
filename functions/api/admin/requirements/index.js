import { requireAdmin } from "../../../_lib/auth.js";
import { json, methodNotAllowed } from "../../../_lib/http.js";
import { REQUIREMENT_SELECT, serializeRequirement } from "../../../_lib/requirements.js";

export async function onRequestGet(context) {
  const admin = await requireAdmin(context);
  if (!admin) return json({ error: "Forbidden." }, 403);
  if (!context.env.REQUIREMENTS_DB) return json({ error: "Requirements database is not configured." }, 503);
  const url = new URL(context.request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const { results = [] } = await context.env.REQUIREMENTS_DB.prepare(`
    SELECT ${REQUIREMENT_SELECT} FROM property_requirements ORDER BY submitted_at DESC LIMIT ?
  `).bind(limit).all();
  return json({ submissions: results.map((row) => serializeRequirement(row)) });
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");

