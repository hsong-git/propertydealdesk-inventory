import { resolvePhotoGrant } from "../../_lib/grants.js";
import { json, methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const resolved = await resolvePhotoGrant({ env: context.env, token: String(context.params.token || "") });
    if (!resolved) return neutralUnavailable();
    return json({
      available: true,
      code: resolved.record.code,
      title: resolved.record.title,
      expiresAt: resolved.record.expiresAt,
      downloadPath: `/api/photo-download/${context.params.token}`,
    });
  } catch {
    return neutralUnavailable();
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");
