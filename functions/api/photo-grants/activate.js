import { requireRecipient } from "../../_lib/auth.js";
import { activateCatalogueGrant, activateListingGrant, findGrantByToken, sessionCookieHeader } from "../../_lib/grants.js";
import { isSameOriginRequest, json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  try {
    const token = String(payload?.token || "");
    const grant = await findGrantByToken({ env: context.env, token });
    const recipient = grant?.listingCode ? null : await requireRecipient(context);
    if (!grant?.listingCode && !recipient) return neutralUnavailable();
    const activated = grant?.listingCode
      ? await activateListingGrant({ env: context.env, token })
      : await activateCatalogueGrant({ env: context.env, token, recipientEmail: recipient.email });
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
