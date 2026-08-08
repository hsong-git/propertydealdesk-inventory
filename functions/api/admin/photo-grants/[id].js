import { requireAdmin } from "../../../_lib/auth.js";
import { revokeCatalogueGrant } from "../../../_lib/grants.js";
import { isSameOriginRequest, json, methodNotAllowed } from "../../../_lib/http.js";

export async function onRequestDelete(context) {
  if (!isSameOriginRequest(context.request)) return json({ error: "Forbidden." }, 403);
  const admin = await requireAdmin(context);
  if (!admin) return json({ error: "Forbidden." }, 403);
  try {
    const revoked = await revokeCatalogueGrant({ env: context.env, id: String(context.params.id || ""), createdBy: admin.email });
    return revoked ? json({ revoked: true }) : json({ error: "Grant not found or already revoked." }, 404);
  } catch {
    return json({ error: "Photo grants are not configured." }, 503);
  }
}

export const onRequest = (context) => context.request.method === "DELETE"
  ? onRequestDelete(context)
  : methodNotAllowed("DELETE");
