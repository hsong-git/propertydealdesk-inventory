import test from "node:test";
import assert from "node:assert/strict";

import { canonicalShortcutCode, onRequest, onRequestGet, renderUnavailableShortcutHtml } from "./[code].js";

test("renders a public-safe unavailable page for deleted short links", () => {
  const html = renderUnavailableShortcutHtml("WTL0050");

  assert.match(html, /This property is no longer available/);
  assert.match(html, /sold, rented, withdrawn, or no longer available/);
  assert.match(html, /WTL0050/);
  assert.match(html, /Browse current listings/);
  assert.match(html, /Contact HS Ong/);
  assert.doesNotMatch(html, /Property shortcut not found/);
});

test("redirects legacy CMI display-code shortcuts to the routable listing code", async () => {
  assert.equal(canonicalShortcutCode("CMI-WTL0083"), "WTL0083");
  const response = await onRequestGet({
    env: { ASSETS: { fetch: () => assert.fail("legacy aliases redirect before an asset lookup") } },
    params: { code: "CMI-WTL0083" },
    request: new Request("https://scmi.myeviv.com/i/CMI-WTL0083?v=2026.10.16.2"),
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://scmi.myeviv.com/i/WTL0083?v=2026.10.16.2");
});

test("serves HEAD requests with the same listing headers and no response body", async () => {
  const assets = {
    fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === "/data/inventory.json") {
        return new Response(JSON.stringify({ listings: [{ code: "WTL0070" }] }), {
          headers: { "content-type": "application/json" },
        });
      }
      if (pathname === "/i/WTL0070/index.html") {
        return new Response("<html>listing</html>", {
          headers: { "content-type": "text/html; charset=utf-8", "x-listing-page": "yes" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },
  };

  const response = await onRequest({
    env: { ASSETS: assets },
    params: { code: "WTL0070" },
    request: new Request("https://property.myeviv.com/i/WTL0070", { method: "HEAD" }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("x-listing-page"), "yes");
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0, must-revalidate");
  assert.equal(await response.text(), "");
});

test("serves legacy shortcut redirects to HEAD requests without a body", async () => {
  const response = await onRequest({
    env: { ASSETS: { fetch: () => assert.fail("legacy aliases redirect before an asset lookup") } },
    params: { code: "CMI-WTL0083" },
    request: new Request("https://scmi.myeviv.com/i/CMI-WTL0083?v=2026.10.16.2", { method: "HEAD" }),
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://scmi.myeviv.com/i/WTL0083?v=2026.10.16.2");
  assert.equal(await response.text(), "");
});

test("advertises GET and HEAD for unsupported methods", async () => {
  const response = await onRequest({
    env: {},
    params: { code: "WTL0070" },
    request: new Request("https://property.myeviv.com/i/WTL0070", { method: "POST" }),
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});
