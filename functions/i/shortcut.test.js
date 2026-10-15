import test from "node:test";
import assert from "node:assert/strict";

import { canonicalShortcutCode, onRequestGet, renderUnavailableShortcutHtml } from "./[code].js";

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
    request: new Request("https://scmi.myeviv.com/i/CMI-WTL0083"),
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://scmi.myeviv.com/i/WTL0083");
});
