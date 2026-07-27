import assert from "node:assert/strict";
import test from "node:test";
import { INVENTORY_REFRESH_INTERVAL_MS, inventoryFeedUrl } from "./inventoryRefresh.js";

test("inventory feed requests are cache-busted and periodically refreshed", () => {
  assert.equal(inventoryFeedUrl(123456), "/data/inventory.json?published=123456");
  assert.equal(INVENTORY_REFRESH_INTERVAL_MS, 30_000);
});
