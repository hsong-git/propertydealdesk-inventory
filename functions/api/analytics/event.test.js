import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "./event.js";

function db() {
  const calls = [];
  return { calls, prepare(sql) { return { bind(...values) { return { async run() { calls.push({ sql, values }); } }; } }; } };
}

function request(payload, origin = "https://property.myeviv.com") {
  return new Request(`${origin}/api/analytics/event`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload),
  });
}

test("records a privacy-safe event with its site host", async () => {
  const database = db();
  const response = await onRequest({ request: request({ eventName: "whatsapp_click", sessionId: "12345678-abcd", source: "facebook_oct", pagePath: "/property/example", listingCode: "wtl0092", intent: "WTL", properties: { placement: "detail", ignored: { private: true } } }), env: { REQUIREMENTS_DB: database } });
  assert.equal(response.status, 204);
  assert.equal(database.calls.length, 1);
  const values = database.calls[0].values;
  assert.equal(values[3], "property.myeviv.com");
  assert.deepEqual(values.slice(4, 9), ["/property/example", "12345678-abcd", "facebook_oct", "WTL0092", "WTL"]);
  assert.deepEqual(JSON.parse(values[9]), { placement: "detail" });
});

test("rejects cross-origin, unapproved and identifying-shaped payloads", async () => {
  const database = db();
  const crossOrigin = request({ eventName: "listing_view", sessionId: "12345678", pagePath: "/" });
  crossOrigin.headers.set("origin", "https://other.example");
  assert.equal((await onRequest({ request: crossOrigin, env: { REQUIREMENTS_DB: database } })).status, 403);
  assert.equal((await onRequest({ request: request({ eventName: "email_captured", sessionId: "12345678", pagePath: "/" }), env: { REQUIREMENTS_DB: database } })).status, 400);
  assert.equal(database.calls.length, 0);
});

