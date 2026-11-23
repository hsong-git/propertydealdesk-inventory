export function searchShareTarget(query, origin) {
  const url = new URL("/", origin);
  url.search = query.toString();
  return url;
}
export async function createSearchLink(target, fetcher = fetch) {
  const response = await fetcher(new URL("/api/search-links", target.origin), {
    method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: target.search.slice(1) }),
  });
  if (!response.ok) throw new Error("Unable to create a short search link. Please try again.");
  const data = await response.json();
  if (!/^\/s\/[A-Za-z0-9_-]{16}$/.test(data.path || "")) throw new Error("Invalid search link.");
  return new URL(data.path, target.origin).href;
}
