import { registerPhotoVisitor, resolvePhotoDownload, visitorSessionCookie } from "../../_lib/grants.js";
import { json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

const sameOrigin = (request) => { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; };

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Request rejected." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  try {
    const visitor = await registerPhotoVisitor({ env: context.env, name: payload?.name, email: payload?.email, contactNumber: payload?.contactNumber });
    if (!visitor) return json({ error: "Enter a valid name, email and contact number (for example 016-313 2865 or +60163132865)." }, 400);
    return json({ registered: true }, 200, { "set-cookie": visitorSessionCookie(visitor.sessionToken, { secure: new URL(context.request.url).protocol === "https:" }) });
  } catch { return json({ error: "Photo download registration is unavailable." }, 503); }
}

export async function onRequestGet(context) {
  try {
    const resolved = await resolvePhotoDownload({ env: context.env, request: context.request, code: context.params.token, includeObject: true });
    if (!resolved || !("body" in resolved.object)) return neutralUnavailable();
    await context.env.REQUIREMENTS_DB.prepare("INSERT INTO photo_download_events (id, visitor_id, listing_code, downloaded_at, user_agent) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), resolved.visitor.visitor_id, resolved.code, new Date().toISOString(), (context.request.headers.get("user-agent") || "").slice(0, 300)).run();
    const headers = new Headers({ "content-type": "application/zip", "content-disposition": `attachment; filename="${resolved.code}-watermarked-photos.zip"`, "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" });
    return new Response(resolved.object.body, { status: 200, headers });
  } catch { return neutralUnavailable(); }
}

export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : context.request.method === "GET" ? onRequestGet(context) : methodNotAllowed("GET, POST");
