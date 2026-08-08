import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhotoGrantStatus } from "./downloadGrantContract.js";

const token = "aB7_opaqueGrantToken-1234567890xyzABCDEFghi";
const payload = {
  available: true,
  scope: "catalogue",
  inventoryVersion: "2026.08.07.1",
  expiresAt: "2026-08-01T01:00:00Z",
};

test("accepts a live catalogue grant for the exact opaque token", () => {
  const grant = normalizePhotoGrantStatus(payload, token, new Date("2026-07-27T02:00:00Z"));
  assert.equal(grant.scope, "catalogue");
  assert.equal(grant.inventoryVersion, "2026.08.07.1");
});

test("invalid, mismatched and expired catalogue grants are unavailable", () => {
  assert.equal(normalizePhotoGrantStatus(payload, "WTL0010", new Date("2026-07-27T02:00:00Z")), null);
  assert.equal(normalizePhotoGrantStatus(payload, token, new Date("2026-08-02T00:00:00Z")), null);
  assert.equal(normalizePhotoGrantStatus({ ...payload, scope: "listing" }, token, new Date("2026-07-27T02:00:00Z")), null);
});
