import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhotoGrantStatus } from "./downloadGrantContract.js";

const token = "aB7_opaqueGrantToken-1234567890xyzABCDEFghi";
const payload = {
  available: true,
  code: "WTL0010",
  title: "Office Lot photos",
  expiresAt: "2026-08-01T01:00:00Z",
  downloadPath: `/api/photo-download/${token}`,
};

test("accepts a live backend-resolved grant for the exact opaque token", () => {
  const grant = normalizePhotoGrantStatus(payload, token, new Date("2026-07-27T02:00:00Z"));
  assert.equal(grant.code, "WTL0010");
});

test("invalid, mismatched and expired backend grants are unavailable", () => {
  assert.equal(normalizePhotoGrantStatus(payload, "WTL0010", new Date("2026-07-27T02:00:00Z")), null);
  assert.equal(normalizePhotoGrantStatus(payload, token, new Date("2026-08-02T00:00:00Z")), null);
  assert.equal(normalizePhotoGrantStatus({ ...payload, downloadPath: "/api/photo-download/different" }, token, new Date("2026-07-27T02:00:00Z")), null);
});
