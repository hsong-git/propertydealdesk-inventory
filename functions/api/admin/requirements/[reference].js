import { requireAdmin } from "../../../_lib/auth.js";
import { isSameOriginRequest, json, methodNotAllowed } from "../../../_lib/http.js";
import { REQUIREMENT_SELECT, serializeRequirement } from "../../../_lib/requirements.js";

const normalizeReference = (value) => {
  const reference = String(value || "").trim().toUpperCase();
  return /^WT[RB]\d{6}$/.test(reference) ? reference : "";
};

const authorize = async (context, mutation = false) => {
  if (mutation && !isSameOriginRequest(context.request)) return null;
  return requireAdmin(context);
};

export async function onRequestGet(context) {
  if (!await authorize(context)) return json({ error: "Forbidden." }, 403);
  const reference = normalizeReference(context.params.reference);
  if (!reference || !context.env.REQUIREMENTS_DB) return json({ error: "Submission not found." }, 404);
  const row = await context.env.REQUIREMENTS_DB.prepare(`SELECT ${REQUIREMENT_SELECT} FROM property_requirements WHERE reference = ?`)
    .bind(reference).first();
  return row ? json({ submission: serializeRequirement(row, { includeDetails: true }) }) : json({ error: "Submission not found." }, 404);
}

export async function onRequestPatch(context) {
  if (!await authorize(context, true)) return json({ error: "Forbidden." }, 403);
  const reference = normalizeReference(context.params.reference);
  if (!reference || !context.env.REQUIREMENTS_DB) return json({ error: "Submission not found." }, 404);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (payload?.status !== "read") return json({ error: "Only mark-as-read is supported." }, 400);
  const result = await context.env.REQUIREMENTS_DB.prepare("UPDATE property_requirements SET status = 'read', read_at = ? WHERE reference = ?")
    .bind(new Date().toISOString(), reference).run();
  return result.meta?.changes ? json({ updated: true }) : json({ error: "Submission not found." }, 404);
}

export async function onRequestDelete(context) {
  if (!await authorize(context, true)) return json({ error: "Forbidden." }, 403);
  const reference = normalizeReference(context.params.reference);
  if (!reference || !context.env.REQUIREMENTS_DB) return json({ error: "Submission not found." }, 404);
  const result = await context.env.REQUIREMENTS_DB.prepare("DELETE FROM property_requirements WHERE reference = ?").bind(reference).run();
  return result.meta?.changes ? json({ deleted: true }) : json({ error: "Submission not found." }, 404);
}

export const onRequest = (context) => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "PATCH") return onRequestPatch(context);
  if (context.request.method === "DELETE") return onRequestDelete(context);
  return methodNotAllowed("GET, PATCH, DELETE");
};

