import { requireAdmin } from "../../_lib/auth.js";
import { createCatalogueGrant, isEmail } from "../../_lib/grants.js";
import { isSameOriginRequest, json, methodNotAllowed } from "../../_lib/http.js";

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  const admin = await requireAdmin(context);
  if (!admin) return json({ error: "Forbidden." }, 403);

  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!isEmail(email)) return json({ error: "Enter a valid recipient email address." }, 400);
  try {
    const grant = await createCatalogueGrant({ env: context.env, email, createdBy: admin.email, origin: new URL(context.request.url).origin });
    return grant ? json(grant, 201) : json({ error: "Could not create the catalogue grant." }, 409);
  } catch {
    return json({ error: "Photo downloads are not configured." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");
