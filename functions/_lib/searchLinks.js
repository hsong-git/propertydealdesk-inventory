export const SEARCH_LINK_ID = /^[a-zA-Z0-9_-]{16}$/;
const MULTI = new Set(["type", "location", "furnishing"]);
const KEYS = new Set(["q", "intent", "type", "location", "min", "max", "beds", "furnishing", "sort", "inventory", "view"]);
export function normalizeSearchQuery(query) {
  if (typeof query !== "string" || query.length > 4096 || query.startsWith("?")) throw new Error("Invalid search");
  const input = new URLSearchParams(query), result = new URLSearchParams();
  if ([...input].length > 40) throw new Error("Too many filters");
  for (const key of [...new Set(input.keys())].sort()) {
    if (!KEYS.has(key) || (!MULTI.has(key) && input.getAll(key).length > 1)) throw new Error("Invalid filter");
    for (const value of [...new Set(input.getAll(key))].sort()) {
      if (value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) throw new Error("Invalid value");
      if (key === "intent" && !["", "WTL", "WTS"].includes(value)) throw new Error("Invalid intent");
      if (["min", "max", "beds"].includes(key) && value && !/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) throw new Error("Invalid number");
      if (key === "sort" && !["recent", "newest", "price-asc", "price-desc", "title"].includes(value)) throw new Error("Invalid sort");
      if (key === "inventory" && !["", "smi", "cmi"].includes(value)) throw new Error("Invalid inventory");
      if (key === "view" && !["all", "featured"].includes(value)) throw new Error("Invalid view");
      if (value) result.append(key, value);
    }
  }
  // A fixed attribution label describes a shared search, not a verified source app.
  // Include an explicit view even for All, so recipients' saved filters cannot
  // override an otherwise empty shared search.
  result.set("view", result.get("view") || "all");
  result.set("utm_source", "catalogue_search");
  result.set("utm_medium", "share");
  result.set("utm_campaign", "shared_search");
  return result.toString();
}
export async function searchLinkId(host, query) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(host + "\n" + query)));
  return btoa(String.fromCharCode(...hash.slice(0, 12))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export async function readSearchBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request");
  let size = 0, text = ""; const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error("Request too large"); }
      text += decoder.decode(value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}
