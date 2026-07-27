import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";

export async function onRequestGet(context) {
  const admin = await requireAdmin(context);
  return admin ? json({ authenticated: true, email: admin.email }) : json({ authenticated: false }, 401);
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");
