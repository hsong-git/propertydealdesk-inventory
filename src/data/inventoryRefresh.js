export const INVENTORY_REFRESH_INTERVAL_MS = 30_000;

export function inventoryFeedUrl(now = Date.now()) {
  return `/data/inventory.json?published=${encodeURIComponent(String(now))}`;
}
