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
  assert.deepEqual(JSON.parse(values[9]), { placement: "detail", quality_version: 1, quality_bot: 0, quality_reason: "none" });
});

test("rejects cross-origin, unapproved and identifying-shaped payloads", async () => {
  const database = db();
  const crossOrigin = request({ eventName: "listing_view", sessionId: "12345678", pagePath: "/" });
  crossOrigin.headers.set("origin", "https://other.example");
  assert.equal((await onRequest({ request: crossOrigin, env: { REQUIREMENTS_DB: database } })).status, 403);
  assert.equal((await onRequest({ request: request({ eventName: "email_captured", sessionId: "12345678", pagePath: "/" }), env: { REQUIREMENTS_DB: database } })).status, 400);
  assert.equal(database.calls.length, 0);
});

test("records bounded campaign metadata and drops identifying-shaped attribution", async () => {
  const database=db();
  const response=await onRequest({request:request({eventName:"listing_view",sessionId:"12345678",pagePath:"/property/unit",source:"example.com",attribution:{medium:"referral",campaign:"rentals",content:"person@example.com",method:"referrer"},properties:{traffic_campaign:"spoofed"}}),env:{REQUIREMENTS_DB:database}});
  assert.equal(response.status,204);
  assert.deepEqual(JSON.parse(database.calls[0].values[9]),{quality_version:1,quality_bot:0,quality_reason:"none",traffic_medium:"referral",traffic_campaign:"rentals",traffic_method:"referrer"});
});

test("quality flags cannot be supplied by clients and known crawlers are flagged without blocking events", async () => {
  for (const [agent, flagged] of [["facebookexternalhit/1.1", 1], ["HeadlessChrome/130", 1], ["Mozilla/5.0 FBAN/FB4A; FBAV/400", 0], ["Mozilla/5.0 Safari", 0]]) {
    const database = db();
    const req = request({ eventName: "listing_view", sessionId: "12345678", pagePath: "/property/example", properties: { quality_bot: 0, quality_reason: "human", quality_engaged: 1 } });
    req.headers.set("user-agent", agent);
    assert.equal((await onRequest({ request: req, env: { REQUIREMENTS_DB: database } })).status, 204);
    const props = JSON.parse(database.calls[0].values[9]);
    assert.equal(props.quality_bot, flagged);
    assert.equal(props.quality_version, 1);
    assert.ok(!Object.hasOwn(props, "quality_engaged"));
    assert.ok(!JSON.stringify(props).includes(agent));
  }
});

test("engagement requires active viewing plus interaction and excludes flagged automation", async () => {
  for (const [active_ms, interacted, path, automation, expected] of [[9999,true,"/",false,400],[10000,false,"/",false,400],[10000,true,"/admin/analytics",false,400],[10000,true,"/",false,204],[10000,true,"/",true,204]]) {
    const database = db();
    const response = await onRequest({ request: request({ eventName:"session_engaged", sessionId:"12345678",pagePath:path,properties:{active_ms,interacted},clientContext:{automation} }), env:{ REQUIREMENTS_DB:database } });
    assert.equal(response.status, expected);
    if (expected === 204) assert.equal(JSON.parse(database.calls[0].values[9]).quality_engaged, automation ? 0 : 1);
    else assert.equal(database.calls.length, 0);
  }
});

test("Cloudflare verified and likely automated requests are flagged when the signals exist", async () => {
  for (const [cf, expected] of [[{botManagement:{verifiedBot:true}},1],[{botManagement:{score:1}},1],[{botManagement:{score:29}},1],[{botManagement:{score:80}},0],[{botManagement:{score:0}},0],[{},0]]) {
    const database = db();
    const req = request({eventName:"listing_view",sessionId:"12345678",pagePath:"/"});
    Object.defineProperty(req,"cf",{value:cf});
    assert.equal((await onRequest({ request:req, env:{REQUIREMENTS_DB:database} })).status,204);
    assert.equal(JSON.parse(database.calls[0].values[9]).quality_bot,expected);
  }
});

test("oversized analytics bodies are rejected before storage", async () => {
  const database=db();
  const response=await onRequest({request:request({padding:"x".repeat(9000)}),env:{REQUIREMENTS_DB:database}});
  assert.equal(response.status,413);
  assert.equal(database.calls.length,0);
});

