import { resolveCatalogueSession } from "../../_lib/grants.js";
import { methodNotAllowed, neutralUnavailable } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const code = String(context.params.code || "").trim().toUpperCase();
    const resolved = await resolveCatalogueSession({ env: context.env, request: context.request, code, includeObject: true });
    if (!resolved || !resolved.object?.body) return neutralUnavailable();
    const headers = new Headers();
    resolved.object.writeHttpMetadata(headers);
    headers.set("content-type", "application/zip");
    headers.set("content-disposition", `attachment; filename="${code}-watermarked-photos.zip"`);
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
