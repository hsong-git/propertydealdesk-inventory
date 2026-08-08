import { resolveCatalogueSession } from "../../_lib/grants.js";
import { json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const code = String(context.params.code || "").trim().toUpperCase();
    const resolved = await resolveCatalogueSession({ env: context.env, request: context.request, code });
    if (!resolved) return neutralUnavailable();
    return json({
      available: true,
      code,
      inventoryVersion: resolved.grant.inventoryVersion,
      expiresAt: resolved.grant.activeExpiresAt,
    });
  } catch {
    return neutralUnavailable();
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");
