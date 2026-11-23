import { SEARCH_LINK_ID } from "../_lib/searchLinks.js";
import { methodNotAllowed } from "../_lib/http.js";
export async function onRequest(context) {
  const method = context.request.method;
  if (!["GET", "HEAD"].includes(method)) return methodNotAllowed("GET, HEAD");
  const unavailable = () => new Response(method === "HEAD" ? null : "This shared search is unavailable.", { status: 404, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });
  if (!SEARCH_LINK_ID.test(context.params.id || "")) return unavailable();
  try {
    const url = new URL(context.request.url);
    const row = await context.env.REQUIREMENTS_DB.prepare("SELECT search_query FROM shared_search_links WHERE id=? AND site_host=?").bind(context.params.id, url.host).first();
    if (!row) return unavailable();
    const destination = new URL("/", url);
    destination.search = row.search_query;
    return new Response(null, { status: 302, headers: { location: destination.href, "cache-control": "no-store", "x-robots-tag": "noindex" } });
  } catch { return new Response("Search sharing is temporarily unavailable.", { status: 503, headers: { "cache-control": "no-store" } }); }
}
