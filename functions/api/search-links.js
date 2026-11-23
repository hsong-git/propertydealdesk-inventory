import { json, isSameOriginRequest, methodNotAllowed } from "../_lib/http.js";
import { normalizeSearchQuery, searchLinkId, readSearchBody } from "../_lib/searchLinks.js";
export async function onRequest(context) {
  if (context.request.method !== "POST") return methodNotAllowed("POST");
  if (!isSameOriginRequest(context.request)) return json({ error: "Request rejected." }, 403);
  let query;
  try { query = normalizeSearchQuery((await readSearchBody(context.request)).query); }
  catch { return json({ error: "Invalid search filters." }, 400); }
  const host = new URL(context.request.url).host;
  try {
    const db = context.env.REQUIREMENTS_DB;
    const id = await searchLinkId(host, query);
    let row = await db.prepare("SELECT site_host, search_query FROM shared_search_links WHERE id = ?").bind(id).first();
    if (!row) {
      const now = new Date().toISOString(), since = new Date(Date.now() - 86400000).toISOString();
      await db.prepare("INSERT OR IGNORE INTO shared_search_links(id,site_host,search_query,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM shared_search_links WHERE site_host=? AND created_at>=?) < 1000")
        .bind(id, host, query, now, host, since).run();
      row = await db.prepare("SELECT site_host, search_query FROM shared_search_links WHERE id = ?").bind(id).first();
      if (!row) return json({ error: "Search sharing is busy. Please try again later." }, 429);
    }
    if (row.site_host !== host || row.search_query !== query) return json({ error: "Unable to create search link." }, 409);
    return json({ path: "/s/" + id });
  } catch { return json({ error: "Search sharing is temporarily unavailable." }, 503); }
}
