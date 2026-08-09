import { requireRecipient } from "../../_lib/auth.js";
import { findGrantByToken } from "../../_lib/grants.js";
import { json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const grant = await findGrantByToken({ env: context.env, token: String(context.params.token || "") });
    const recipient = grant?.listingCode ? { email: grant.recipientEmail } : await requireRecipient(context);
    if (!recipient || !grant || (!grant.listingCode && grant.recipientEmail !== recipient.email) || grant.revokedAt || Date.parse(grant.absoluteExpiresAt) <= Date.now()) return neutralUnavailable();
    return json({
      available: true,
      scope: "catalogue",
      listingCode: grant.listingCode,
      inventoryVersion: grant.inventoryVersion,
      expiresAt: grant.activeExpiresAt || grant.absoluteExpiresAt,
      activated: Boolean(grant.firstAccessAt),
    });
  } catch {
    return neutralUnavailable();
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");
