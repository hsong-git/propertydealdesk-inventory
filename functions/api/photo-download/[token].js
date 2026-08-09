import { resolvePhotoGrant } from "../../_lib/grants.js";
import { methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const resolved = await resolvePhotoGrant({ env: context.env, token: String(context.params.token || ""), includeObject: true });
    if (!resolved || !("body" in resolved.object)) return neutralUnavailable();
    const headers = new Headers();
    resolved.object.writeHttpMetadata(headers);
    headers.set("content-type", "application/zip");
    headers.set("content-disposition", `attachment; filename="${resolved.record.code}-sanitized-photos.zip"`);
    headers.set("cache-control", "private, no-store, max-age=0");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    if (resolved.object.httpEtag) headers.set("etag", resolved.object.httpEtag);
    return new Response(resolved.object.body, { status: 200, headers });
  } catch {
    return neutralUnavailable();
  }
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : methodNotAllowed("GET");
