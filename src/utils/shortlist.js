import { listingDetailUrl, formatPrice } from "./listing.js";
export const SHORTLIST_LIMIT = 30;
export const shortlistKey = listing => String(listing.publicId || listing.code || "");
export function normalizeShortlist(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(value => typeof value === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(value)))].slice(0, SHORTLIST_LIMIT);
}
export function resolveShortlist(keys, items) {
  return normalizeShortlist(keys).map(key => ({ key, listing: items.find(item => shortlistKey(item) === key) || null }));
}
export function shortlistMessage(listings, t = text => text, origin) {
  return [t("Hi HS Ong, I am interested in these properties:"), "", ...listings.slice(0, SHORTLIST_LIMIT).flatMap(listing => [
    `${listing.displayCode || listing.code} · ${listing.title}`, formatPrice(listing.price, listing.intent), listingDetailUrl(listing, origin), "",
  ]), t("Please confirm availability and help arrange viewings.")].join("\n");
}
