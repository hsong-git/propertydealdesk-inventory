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
test("SEO routing permanently redirects removed contact and legacy requirement routes", async () => {
  const contact = await run("/contact");
  assert.equal(contact.status, 301);
  assert.equal(contact.headers.get("location"), "https://property.myeviv.com/");
  assert.equal((await run("/requirements")).headers.get("location"), "https://property.myeviv.com/inquiries");
});
test("private HTML is excluded from indexing without changing API or static asset responses", async () => {
  assert.equal((await run("/admin")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await run("/download/token")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await run("/api/admin/session", "application/json")).status, 200);
  assert.equal((await run("/assets/app.js", "application/javascript")).status, 200);
});
