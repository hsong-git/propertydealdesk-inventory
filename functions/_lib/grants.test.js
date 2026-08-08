import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_TTL_SECONDS,
  GRANT_TTL_SECONDS,
  TOKEN_PATTERN,
  activateCatalogueGrant,
  createCatalogueGrant,
  resolveCatalogueSession,
} from "./grants.js";

function fakeEnvironment(metadata = {
  sanitized: "true", watermarked: "true", watermarkVersion: "trr-hs-ong-v1",
  smiCode: "WTL0010", inventoryVersion: "2026.08.07.1", title: "Office Lot photos",
}) {
  const grants = new Map();
  const sessions = new Map();
  const packageObject = { customMetadata: metadata, body: new Uint8Array([80, 75]), httpEtag: '"test"', writeHttpMetadata() {} };
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes("FROM photo_catalogue_grants WHERE token_hash")) return [...grants.values()].find((row) => row.token_hash === args[0]) || null;
              if (sql.includes("FROM photo_catalogue_sessions")) {
                const session = sessions.get(args[0]);
                if (!session) return null;
                const grant = grants.get(session.grant_id);
                return grant ? { ...grant, session_expires_at: session.expires_at } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO photo_catalogue_grants")) {
                const [id, token_hash, recipient_email, created_by, created_at, absolute_expires_at, inventory_version] = args;
                grants.set(id, { id, token_hash, scope: "catalogue", recipient_email, created_by, created_at, absolute_expires_at, first_access_at: null, active_expires_at: null, inventory_version, revoked_at: null });
              } else if (sql.includes("UPDATE photo_catalogue_grants")) {
                const [first_access_at, active_expires_at, id] = args;
                const row = grants.get(id);
                if (row?.first_access_at === null) { row.first_access_at = first_access_at; row.active_expires_at = active_expires_at; }
              } else if (sql.includes("INSERT INTO photo_catalogue_sessions")) {
                const [session_hash, grant_id, created_at, expires_at] = args;
                sessions.set(session_hash, { session_hash, grant_id, created_at, expires_at });
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
  return {
    env: {
      CURRENT_INVENTORY_VERSION: "2026.08.07.1",
      PHOTO_GRANTS_DB: db,
      PHOTO_PACKAGES: {
        async head(key) { return key === "packages/2026.08.07.1/WTL0010.zip" ? packageObject : null; },
        async get(key) { return key === "packages/2026.08.07.1/WTL0010.zip" ? packageObject : null; },
      },
    },
  };
}

test("creates a catalogue-wide 24-hour grant and activates a one-hour recipient session", async () => {
  const { env } = fakeEnvironment();
  const now = new Date("2026-08-07T02:00:00Z");
  const grant = await createCatalogueGrant({ env, email: "Agent@example.com", createdBy: "owner@example.com", origin: "https://inventory.example.com", now });
  assert.match(grant.token, TOKEN_PATTERN);
  assert.equal(grant.expiresAt, "2026-08-08T02:00:00.000Z");
  assert.equal(grant.url, `https://inventory.example.com/download/${grant.token}`);
  assert.equal(grant.recipientEmail, "agent@example.com");
  assert.equal((Date.parse(grant.expiresAt) - now.getTime()) / 1000, GRANT_TTL_SECONDS);
  assert.equal(await activateCatalogueGrant({ env, token: grant.token, recipientEmail: "wrong@example.com", now }), null);
  const activated = await activateCatalogueGrant({ env, token: grant.token, recipientEmail: "agent@example.com", now });
  assert.equal(activated.grant.firstAccessAt, now.toISOString());
  assert.equal((Date.parse(activated.activeExpiresAt) - now.getTime()) / 1000, ACTIVE_TTL_SECONDS);
  const resolved = await resolveCatalogueSession({
    env,
    request: new Request("https://inventory.example.com/api/catalogue-photo-grants/WTL0010", { headers: { cookie: `pd_catalogue_photo_session=${activated.sessionToken}` } }),
    code: "WTL0010",
    now: new Date("2026-08-07T02:30:00Z"),
  });
  assert.equal(resolved.grant.recipientEmail, "agent@example.com");
  assert.equal(await resolveCatalogueSession({
    env,
    request: new Request("https://inventory.example.com", { headers: { cookie: `pd_catalogue_photo_session=${activated.sessionToken}` } }),
    code: "WTS0001",
    now: new Date("2026-08-07T02:30:00Z"),
  }), null);
  assert.equal(await resolveCatalogueSession({
    env,
    request: new Request("https://inventory.example.com", { headers: { cookie: `pd_catalogue_photo_session=${activated.sessionToken}` } }),
    code: "WTL0010",
    now: new Date("2026-08-07T03:00:00Z"),
  }), null);
});

test("rejects packages that are not permanently watermarked", async () => {
  const { env } = fakeEnvironment({ sanitized: "true", watermarked: "false", watermarkVersion: "", smiCode: "WTL0010", inventoryVersion: "2026.08.07.1" });
  const grant = await createCatalogueGrant({ env, email: "agent@example.com", createdBy: "owner@example.com", origin: "https://inventory.example.com" });
  const activated = await activateCatalogueGrant({ env, token: grant.token, recipientEmail: "agent@example.com" });
  assert.equal(await resolveCatalogueSession({ env, request: new Request("https://inventory.example.com", { headers: { cookie: `pd_catalogue_photo_session=${activated.sessionToken}` } }), code: "WTL0010" }), null);
});
