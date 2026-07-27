import assert from "node:assert/strict";
import test from "node:test";
import { normalizeInventoryFeed } from "./inventoryContract.js";

const productionFeed = (listings) => ({
  schema: "propertydealdesk-public-inventory",
  schema_version: "1.0",
  inventoryVersion: "2026-07-27T01:30:00Z",
  generated_at: "2026-07-27T01:30:00Z",
  publishedAt: "2026-07-27T01:30:00Z",
  isMockData: false,
  listings,
});

const stableListing = {
  public_id: "public-wts1004",
  code: "WTS1004",
  intent: "WTS",
  slug: "wts1004-family-home-bukit-tinggi",
  title: "Family Home in Bukit Tinggi",
  property_type: "Terrace House",
  location: "Bukit Tinggi, Klang",
  price: 680000,
  bedroom_count: 4,
  bathroom_count: 3,
  built_up_sqft: 1900,
  availability: "Available",
  updated_at: "2026-07-27T01:20:00Z",
  cover_photo: "/inventory/WTS1004/cover.webp",
  photos: ["/inventory/WTS1004/cover.webp", "/inventory/WTS1004/living.webp"],
};

test("normalizes the Stable snake_case contract into the browser allowlist", () => {
  const raw = {
    ...stableListing,
    internal_note: "must never reach the browser model",
    contact_no: "private-number",
    database_id: 987,
  };
  const { items, meta } = normalizeInventoryFeed(productionFeed([raw]));
  assert.equal(items.length, 1);
  assert.equal(items[0].propertyType, "Terrace House");
  assert.equal(items[0].bedrooms, 4);
  assert.deepEqual(items[0].photos, stableListing.photos);
  assert.equal(meta.inventoryVersion, "2026-07-27T01:30:00Z");
  assert.equal("internal_note" in items[0], false);
  assert.equal("contact_no" in items[0], false);
  assert.equal("database_id" in items[0], false);
});

test("treats listings array membership as authoritative and accepts an empty feed", () => {
  const { items } = normalizeInventoryFeed(productionFeed([]));
  assert.deepEqual(items, []);
});

test("drops non-supply and closed records defensively from a production payload", () => {
  const buyerRequest = { ...stableListing, code: "WTB1001", intent: "WTB" };
  const closedSupply = { ...stableListing, availability: "Closed" };
  const { items } = normalizeInventoryFeed(productionFeed([buyerRequest, closedSupply]));
  assert.deepEqual(items, []);
});

test("drops photo paths outside the listing public inventory directory", () => {
  const raw = {
    ...stableListing,
    cover_photo: "C:\\private\\cover.webp",
    photos: ["/inventory/WTS9999/wrong.webp", "https://example.com/photo.webp"],
  };
  const { items } = normalizeInventoryFeed(productionFeed([raw]));
  assert.deepEqual(items[0].photos, []);
});
