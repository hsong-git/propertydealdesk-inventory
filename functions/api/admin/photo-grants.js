import { requireAdmin } from "../../_lib/auth.js";
import { createPhotoGrant } from "../../_lib/grants.js";
import { isSameOriginRequest, json, methodNotAllowed } from "../../_lib/http.js";

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  const admin = await requireAdmin(context);
  if (!admin) return json({ error: "Forbidden." }, 403);

  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const code = String(payload?.code || "").trim().toUpperCase();
  try {
    const grant = await createPhotoGrant({ env: context.env, code, email: admin.email, origin: new URL(context.request.url).origin });
    return grant ? json(grant, 201) : json({ error: "No sanitized photo package is available for this listing." }, 409);
  } catch {
    return json({ error: "Photo downloads are not configured." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");
