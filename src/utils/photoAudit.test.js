import test from "node:test";
import assert from "node:assert/strict";
import { groupPhotoAudit } from "./photoAudit.js";

const events = [
  { id: "1", anonymous_browser_id: "a", shared_at: "2026-11-23T08:00:00Z", listing_code: "WTL1", photo_count: 2 },
  { id: "2", anonymous_browser_id: "b", shared_at: "2026-11-26T08:00:00Z", listing_code: "WTL2", photo_count: 8 },
  { id: "3", anonymous_browser_id: "a", shared_at: "2026-11-24T08:00:00Z", listing_code: "WTL1", photo_count: 3 },
  { id: "4", shared_at: "2026-11-22T08:00:00Z", listing_code: "WTL3", photo_count: 1 },
  { id: "5", shared_at: "2026-11-21T08:00:00Z", listing_code: "WTL4", photo_count: 1 },
];
test("groups browser events and counts actions, photos and distinct listings without mutating input", () => {
  const original = structuredClone(events);
  const groups = groupPhotoAudit(events);
  assert.deepEqual(groups.map(g => g.key), ["b", "a", "unrecorded"]);
  assert.equal(groups[1].count, 2);
  assert.equal(groups[1].photoCount, 5);
  assert.equal(groups[1].listingCount, 1);
  assert.deepEqual(groups[1].events.map(e => e.id), ["3", "1"]);
  assert.equal(groups[2].browserId, "");
  assert.deepEqual(events, original);
});
test("supports oldest, event count, photo count and browser ID sorting", () => {
  assert.equal(groupPhotoAudit(events, "oldest")[0].key, "unrecorded");
  assert.deepEqual(groupPhotoAudit(events, "oldest")[0].events.map(e => e.id), ["5", "4"]);
  assert.equal(groupPhotoAudit(events, "events")[0].key, "a");
  assert.equal(groupPhotoAudit(events, "photos")[0].key, "b");
  assert.deepEqual(groupPhotoAudit(events, "browser").map(g => g.key), ["a", "b", "unrecorded"]);
  assert.deepEqual(groupPhotoAudit([]), []);
});
