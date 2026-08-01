import { isSameOriginRequest, json, methodNotAllowed } from "../_lib/http.js";
import { createRequirement } from "../_lib/requirements.js";

const MAX_BODY_BYTES = 24_000;

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Submission is too large." }, 413);
  let payload;
  try {
    const rawBody = await context.request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "Submission is too large." }, 413);
    payload = JSON.parse(rawBody);
  } catch { return json({ error: "Invalid request." }, 400); }
  try {
    const result = await createRequirement(context.env, payload);
    if (result.validationErrors) return json({ error: "Please correct the highlighted fields.", fields: result.validationErrors }, 400);
    return json(result, result.duplicate ? 200 : 201);
  } catch (error) {
    if (context.env?.REQUIREMENTS_DB) console.error("Requirement submission failed", error);
    return json({ error: "Saving is temporarily unavailable. Please contact the PropertyDealDesk administrator to enable the requirements database, then try again." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");
