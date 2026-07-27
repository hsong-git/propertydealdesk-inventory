import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDownloadGrants, resolveDownloadGrant } from "./downloadGrantContract.js";

const token = "aB7_opaqueGrantToken-1234567890xyzABC";
const payload = {
  schema: "propertydealdesk-public-download-grants",
  schema_version: "1.0",
  grants: [{ token, smi_code: "WTL0010", title: "Office Lot photos", package_path: `/downloads/${token}/WTL0010-images.zip`, generated_at: "2026-07-27T01:00:00Z", expires_at: "2026-08-01T01:00:00Z", file_count: 12 }],
};

test("accepts a scoped opaque-token ZIP grant", () => {
  const grants = normalizeDownloadGrants(payload);
  assert.equal(grants.length, 1);
  assert.equal(grants[0].smiCode, "WTL0010");
});

test("invalid, mismatched and expired grants are unavailable", () => {
  assert.equal(resolveDownloadGrant(payload, "WTL0010", new Date("2026-07-27T02:00:00Z")), null);
  assert.equal(resolveDownloadGrant(payload, token, new Date("2026-08-02T00:00:00Z")), null);
  const mismatched = structuredClone(payload);
  mismatched.grants[0].package_path = "/downloads/different-token/file.zip";
  assert.equal(normalizeDownloadGrants(mismatched).length, 0);
});
