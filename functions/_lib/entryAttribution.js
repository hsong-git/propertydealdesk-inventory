import { detectAttribution } from "../../src/utils/trafficAttribution.js";

// Supplement document.referrer with the landing request's Referer header.
// Inject only classified labels, never the original URL or its query string.
export function withEntryAttribution(response, request) {
  if (request.method !== "GET" || !response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  const url = new URL(request.url);
  const entry = detectAttribution({ referrer: request.headers.get("referer") || "", hostname: url.hostname });
  if (!["referrer", "app_referrer"].includes(entry.method)) return response;
  const privateResponse = new Response(response.body, response);
  // Referrer-dependent HTML must not leak into another visitor's cached page.
  privateResponse.headers.set("cache-control", "private, no-store");
  privateResponse.headers.delete("content-length");
  privateResponse.headers.delete("etag");
  return new HTMLRewriter().on("head", { element(head) {
    head.prepend(`<meta name="pdd-entry-source" content="${entry.source}"><meta name="pdd-entry-medium" content="${entry.medium}">`, { html: true });
  } }).transform(privateResponse);
}
