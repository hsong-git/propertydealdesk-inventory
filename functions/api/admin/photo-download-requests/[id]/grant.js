import { requireAdmin } from "../../../../_lib/auth.js";
import { createListingGrant } from "../../../../_lib/grants.js";
import { json, methodNotAllowed } from "../../../../_lib/http.js";

const waPhone = (value) => String(value || "").replace(/\D/g, "");
export async function onRequestPost(context) {
  const admin = await requireAdmin(context);
  if (!admin) return json({ error: "Administrator access required." }, 401);
  if (!context.env?.PHOTO_GRANTS_DB) return json({ error: "Request storage is not configured." }, 503);
  const request = await context.env.PHOTO_GRANTS_DB.prepare("SELECT * FROM photo_download_requests WHERE id = ?").bind(context.params.id).first();
  if (!request || request.status !== "pending") return json({ error: "Request is no longer pending." }, 409);
  const grant = await createListingGrant({ env: context.env, requestId: request.id, listingCode: request.listing_code, createdBy: admin.email });
  if (!grant) return json({ error: "Could not create the SMI grant." }, 500);
  grant.url = new URL(`/download/${grant.token}`, context.request.url).toString();
  await context.env.PHOTO_GRANTS_DB.prepare("UPDATE photo_download_requests SET status = 'granted', granted_at = ?, grant_id = ? WHERE id = ?").bind(new Date().toISOString(), grant.id, request.id).run();
  const message = `Hi ${request.requester_name}, HS Ong has granted your photo download request for ${request.listing_code}. Open this property page to download the watermarked photos: ${new URL(`/property/${request.listing_slug}`, context.request.url).toString()}\n\nYour private download activation link: ${grant.url}`;
  return json({ ok: true, whatsappUrl: `https://wa.me/${waPhone(request.requester_phone)}?text=${encodeURIComponent(message)}`, propertyUrl: new URL(`/property/${request.listing_slug}`, context.request.url).toString(), grantUrl: grant.url });
}
export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : methodNotAllowed("POST");
