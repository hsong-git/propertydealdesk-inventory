import { registerPhotoVisitor, resolvePhotoVisitorSession, visitorSessionCookie } from "../../_lib/grants.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

const sameOrigin = (request) => {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
};

export async function onRequestGet(context) {
  try {
    const visitor = await resolvePhotoVisitorSession({ env: context.env, request: context.request });
    return visitor ? json({ registered: true, name: visitor.name }, 200) : json({ registered: false }, 401);
  } catch {
    return json({ registered: false, error: "Photo sharing registration is unavailable." }, 503);
  }
}

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Request rejected." }, 403);
  let payload;
  try { payload = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  try {
    const visitor = await registerPhotoVisitor({ env: context.env, name: payload?.name, email: payload?.email, contactNumber: payload?.contactNumber });
    if (!visitor) return json({ error: "Enter a valid name, email and contact number (for example 016-313 2865 or +60163132865)." }, 400);
    return json({ registered: true, name: visitor.name }, 200, { "set-cookie": visitorSessionCookie(visitor.sessionToken, { secure: new URL(context.request.url).protocol === "https:" }) });
  } catch {
    return json({ error: "Photo sharing registration is unavailable." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : context.request.method === "POST"
    ? onRequestPost(context)
    : methodNotAllowed("GET, POST");
