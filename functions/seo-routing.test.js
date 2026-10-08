import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "./_middleware.js";

const run = (path, contentType = "text/html") => onRequest({
  request: new Request(`https://property.myeviv.com${path}`),
  env: { ASSETS: { fetch: async () => Response.json({ properties: ["active-property"], cataloguePages: 2 }) } },
  next: async () => new Response("page", { headers: { "content-type": contentType } }),
});
test("SEO routing preserves valid properties and rejects removed properties and unknown pages", async () => {
  assert.equal((await run("/property/active-property/")).status, 200);
  assert.equal((await run("/property/removed-property")).status, 404);
  assert.equal((await run("/unknown-page")).status, 404);
  assert.equal((await run("/catalogue/page/2/")).status, 200);
  assert.equal((await run("/catalogue/page/3/")).status, 404);
});

test("unlisted direct-link routes work with noindex without entering discoverable properties", async () => {
  const response = await onRequest({
    request: new Request("https://property.myeviv.com/property/cmi-direct-link"),
    env: { ASSETS: { fetch: async () => Response.json({ properties: [], unlistedProperties: ["cmi-direct-link"], cataloguePages: 1 }) } },
    next: async () => new Response("CMI details", { headers: { "content-type": "text/html" } }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
});
test("SEO routing permanently redirects removed contact and legacy requirement routes", async () => {
  const contact = await run("/contact");
  assert.equal(contact.status, 301);
  assert.equal(contact.headers.get("location"), "https://property.myeviv.com/");
  assert.equal((await run("/requirements")).headers.get("location"), "https://property.myeviv.com/inquiries");
});
test("private HTML is excluded from indexing without changing API or static asset responses", async () => {
  assert.equal((await run("/cmi")).status, 200);
  assert.equal((await run("/cmi")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await run("/admin")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await run("/download/token")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await run("/api/admin/session", "application/json")).status, 200);
  assert.equal((await run("/assets/app.js", "application/javascript")).status, 200);
});

test("SCMI keeps admin on the existing protected origin and uses its combined catalogue", async () => {
  const runScmi = (path) => onRequest({
    request: new Request(`https://scmi.myeviv.com${path}`),
    env: { ASSETS: { fetch: async () => Response.json({ properties: ["cmi-unit"], cataloguePages: 1 }) } },
    next: async () => new Response("page", { headers: { "content-type": "text/html" } }),
  });
  assert.equal((await runScmi("/cmi")).headers.get("location"), "https://scmi.myeviv.com/");
  assert.equal((await runScmi("/admin/inquiries")).headers.get("location"), "https://property.myeviv.com/admin/inquiries");
  assert.equal((await runScmi("/property/cmi-unit")).status, 200);
  assert.equal((await runScmi("/property/cmi-unit")).headers.get("x-robots-tag"), null);
});
