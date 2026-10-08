const appRoutes = new Set(["/", "/cmi", "/inquiries", "/admin", "/admin/inquiries", "/admin/inquiries/manage", "/admin/photo-downloads", "/admin/photo-downloads/audit", "/admin/requirements"]);

const notFound = (method) => new Response(method === "HEAD" ? null : '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>Property or page not found | HS Ong</title></head><body><main><h1>This page is no longer available</h1><p>The property may have been sold, rented, withdrawn or removed.</p><a href="/">Browse current properties</a></main></body></html>', { status: 404, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, follow" } });

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  let unlisted = false;
  if (!["GET", "HEAD"].includes(context.request.method) || pathname.startsWith("/api/") || pathname.startsWith("/i/")) return context.next();
  if (["/about", "/contact", "/requirements"].includes(pathname)) {
    return Response.redirect(new URL(pathname === "/requirements" ? "/inquiries" : "/", url), 301);
  }
  if (pathname.startsWith("/property/") || pathname.startsWith("/catalogue/")) {
    const manifestResponse = await context.env.ASSETS.fetch(new URL("/data/seo-routes.json", url));
    if (!manifestResponse.ok) return new Response("Temporarily unavailable", { status: 503 });
    const manifest = await manifestResponse.json();
    const property = /^\/property\/([^/]+)$/.exec(pathname);
    unlisted = Boolean(property && (manifest.unlistedProperties || []).includes(property[1]));
    const page = /^\/catalogue\/page\/([1-9]\d*)$/.exec(pathname);
    if (!unlisted && !(property && manifest.properties.includes(property[1])) && !(page && Number(page[1]) <= manifest.cataloguePages)) return notFound(context.request.method);
  }
  const response = await context.next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
  const known = appRoutes.has(pathname) || /^\/(property|catalogue)\//.test(pathname) || /^\/download\/[^/]+$/.test(pathname);
  if (!known) return notFound(context.request.method);
  if (unlisted || pathname === "/cmi" || pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/download/")) {
    const privateResponse = new Response(response.body, response);
    privateResponse.headers.set("X-Robots-Tag", "noindex, nofollow");
    return privateResponse;
  }
  return response;
}
