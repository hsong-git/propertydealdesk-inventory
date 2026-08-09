import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet as getSession } from "./admin/session.js";
import { onRequestPost as createGrant } from "./admin/photo-grants.js";
import { onRequestGet as resolveGrant } from "./photo-grants/[token].js";

test("admin session fails closed without a validated Access JWT", async () => {
  const response = await getSession({ request: new Request("https://inventory.example.com/api/admin/session"), env: {} });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { authenticated: false });
});

test("local admin session is available only on a loopback HTTP origin", async () => {
  const response = await getSession({ request: new Request("http://127.0.0.1:5277/api/admin/session"), env: {} });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authenticated: true, email: "local-admin@propertydealdesk.local" });

  const fakeLocalhost = await getSession({ request: new Request("https://127.0.0.1/api/admin/session"), env: {} });
  assert.equal(fakeLocalhost.status, 401);
});

test("grant generation rejects public and cross-origin calls before storage", async () => {
  const noOrigin = await createGrant({ request: new Request("https://inventory.example.com/api/admin/photo-grants", { method: "POST" }), env: {} });
  assert.equal(noOrigin.status, 403);
  const crossOrigin = await createGrant({ request: new Request("https://inventory.example.com/api/admin/photo-grants", { method: "POST", headers: { origin: "https://attacker.example" } }), env: {} });
  assert.equal(crossOrigin.status, 403);
});

test("invalid public token returns the neutral unavailable response", async () => {
  const response = await resolveGrant({ request: new Request("https://inventory.example.com/api/photo-grants/not-valid"), params: { token: "not-valid" }, env: {} });
  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.equal(payload.available, false);
});
