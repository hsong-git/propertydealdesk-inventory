import assert from "node:assert/strict";
import test from "node:test";
import { createPhotoGrant, GRANT_TTL_SECONDS, resolvePhotoGrant, TOKEN_PATTERN } from "./grants.js";

function fakeEnvironment(metadata = { sanitized: "true", smiCode: "WTL0010", inventoryVersion: "2026.07.27.5", title: "Office Lot photos" }) {
  const values = new Map();
  const packageObject = { customMetadata: metadata, body: new Uint8Array([80, 75]), httpEtag: '"test"', writeHttpMetadata() {} };
  return {
    values,
    env: {
      CURRENT_INVENTORY_VERSION: "2026.07.27.5",
      PHOTO_GRANTS: {
        async put(key, value, options) { values.set(key, { value: JSON.parse(value), options }); },
        async get(key) { return values.get(key)?.value || null; },
      },
      PHOTO_PACKAGES: {
        async head(key) { return key === "packages/WTL0010.zip" ? packageObject : null; },
        async get(key) { return key === "packages/WTL0010.zip" ? packageObject : null; },
      },
    },
  };
}

test("creates a random hashed six-hour grant for a sanitized R2 package", async () => {
  const { env, values } = fakeEnvironment();
  const now = new Date("2026-07-27T02:00:00Z");
  const grant = await createPhotoGrant({ env, code: "WTL0010", email: "owner@example.com", origin: "https://inventory.example.com", now });
  assert.match(grant.token, TOKEN_PATTERN);
  assert.equal(grant.expiresAt, "2026-07-27T08:00:00.000Z");
  assert.equal(grant.url, `https://inventory.example.com/download/${grant.token}`);
  const [[storedKey, stored]] = values.entries();
  assert.equal(storedKey.includes(grant.token), false);
  assert.equal(stored.options.expirationTtl, GRANT_TTL_SECONDS);
  assert.equal(stored.value.createdBy, "owner@example.com");

  const resolved = await resolvePhotoGrant({ env, token: grant.token, now: new Date("2026-07-27T07:59:59Z") });
  assert.equal(resolved.record.code, "WTL0010");
  const expired = await resolvePhotoGrant({ env, token: grant.token, now: new Date("2026-07-27T08:00:00Z") });
  assert.equal(expired, null);
});

test("refuses missing, mismatched, or unsanitized R2 packages", async () => {
  const bad = fakeEnvironment({ sanitized: "false", smiCode: "WTL0010", inventoryVersion: "2026.07.27.5" });
  assert.equal(await createPhotoGrant({ env: bad.env, code: "WTL0010", email: "owner@example.com", origin: "https://inventory.example.com" }), null);
  const good = fakeEnvironment();
  assert.equal(await createPhotoGrant({ env: good.env, code: "WTB0010", email: "owner@example.com", origin: "https://inventory.example.com" }), null);
});
