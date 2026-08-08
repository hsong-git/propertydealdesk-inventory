import { requireRecipient } from "../../_lib/auth.js";
import { activateCatalogueGrant, sessionCookieHeader } from "../../_lib/grants.js";
import { isSameOriginRequest, json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  const recipient = await requireRecipient(context);
  if (!recipient) return neutralUnavailable();
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  try {
    const activated = await activateCatalogueGrant({
      env: context.env,
      token: String(payload?.token || ""),
      recipientEmail: recipient.email,
    });
    if (!activated) return neutralUnavailable();
    return json({
      available: true,
      scope: "catalogue",
      inventoryVersion: activated.grant.inventoryVersion,
      expiresAt: activated.activeExpiresAt,
    }, 200, { "set-cookie": sessionCookieHeader(activated.sessionToken, activated.activeExpiresAt) });
  } catch {
    return neutralUnavailable();
  }
}

export const onRequest = (context) => context.request.method === "POST"
  ? onRequestPost(context)
  : methodNotAllowed("POST");
