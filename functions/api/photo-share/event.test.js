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
    assert.match(response.headers.get("set-cookie"), /pd_photo_anon=[0-9a-f-]{36}; Path=\/api\/photo-share\/; Max-Age=7776000; HttpOnly; SameSite=Strict; Secure/);
    assert.match(event.values[7], /^[0-9a-f]{64}$/);
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
  const unavailable = await onRequest({ request: request(), env: {} });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("set-cookie"), null);
  assert.equal((await onRequest({ request: new Request("https://property.myeviv.com/api/photo-share/event"), env: {} })).status, 405);
});

test("repeat downloads reuse the browser ID while separate browsers get different IDs", async () => {
  const db = database();
  const first = await onRequest({ request: request(), env: { REQUIREMENTS_DB: db } });
  const cookie = first.headers.get("set-cookie").split(";")[0];
  const second = await onRequest({ request: request(undefined, { cookie }), env: { REQUIREMENTS_DB: db } });
  await onRequest({ request: request(), env: { REQUIREMENTS_DB: db } });
  assert.equal(second.status, 200);
  assert.equal(db.batches[0][1].values[7], db.batches[1][1].values[7]);
  assert.notEqual(db.batches[0][1].values[7], db.batches[2][1].values[7]);
  assert.equal(second.headers.get("set-cookie").split(";")[0], cookie);
  assert.doesNotMatch(JSON.stringify(db.batches), new RegExp(cookie.split("=")[1]));
});

test("malformed anonymous cookies are replaced and cannot inject response headers", async () => {
  const db = database();
  const response = await onRequest({ request: request(undefined, { cookie: "pd_photo_anon=not-an-id; pd_photo_session=registered" }), env: { REQUIREMENTS_DB: db } });
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.headers.get("set-cookie"), /not-an-id|registered/);
  assert.match(db.batches[0][1].values[7], /^[0-9a-f]{64}$/);
});
