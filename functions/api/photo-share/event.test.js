import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "./event.js";

function request(payload = { code: "WTL0092", photoCount: 2, client: "download" }, headers = {}) {
  return new Request("https://property.myeviv.com/api/photo-share/event", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

function database() {
  const batches = [];
  return {
    batches,
    prepare(sql) { return { bind(...values) { return { sql, values }; } }; },
    async batch(statements) { batches.push(statements); return statements.map(() => ({ success: true })); },
  };
}

for (const client of ["download", "native", "app", "web"]) {
  test(`${client} events work without registration and record Anonymous`, async () => {
    const db = database();
    const response = await onRequest({ request: request({ code: "wtl0092", photoCount: 2, client }), env: { REQUIREMENTS_DB: db } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { recorded: true });
    const [visitor, event] = db.batches[0];
    assert.match(visitor.sql, /ON CONFLICT\(id\) DO UPDATE SET last_seen_at/);
    assert.deepEqual(visitor.values.slice(0, 4), ["anonymous-photo-visitor", "Anonymous", "", ""]);
    assert.deepEqual(event.values.slice(1, 5), [visitor.values[0], "WTL0092", 2, client]);
    assert.equal(event.values[5], visitor.values[4]);
    assert.equal(response.headers.get("set-cookie"), null);
  });
}

test("existing registration cookies and supplied personal details are ignored", async () => {
  const db = database();
  const response = await onRequest({
    request: request({ code: "WTS1031", photoCount: 1, client: "download", name: "Private Name", email: "private@example.com", contactNumber: "0123456789" }, { cookie: "pd_photo_session=old-registration", "user-agent": "A".repeat(500) }),
    env: { REQUIREMENTS_DB: db },
  });
  assert.equal(response.status, 200);
  assert.doesNotMatch(JSON.stringify(db.batches), /Private Name|private@example|0123456789|old-registration/);
  assert.equal(db.batches[0][1].values[6].length, 300);
});

test("cross-origin and invalid events are rejected without database writes", async () => {
  const db = database();
  assert.equal((await onRequest({ request: request(undefined, { origin: "https://other.example" }), env: { REQUIREMENTS_DB: db } })).status, 403);
  for (const payload of [{ code: "bad", photoCount: 1, client: "download" }, { code: "WTL0092", photoCount: 0, client: "download" }, { code: "WTL0092", photoCount: 1, client: "invalid" }]) {
    assert.equal((await onRequest({ request: request(payload), env: { REQUIREMENTS_DB: db } })).status, 400);
  }
  assert.equal(db.batches.length, 0);
});

test("audit outages and unsupported methods have controlled responses", async () => {
  assert.equal((await onRequest({ request: request(), env: {} })).status, 503);
  assert.equal((await onRequest({ request: new Request("https://property.myeviv.com/api/photo-share/event"), env: {} })).status, 405);
});
