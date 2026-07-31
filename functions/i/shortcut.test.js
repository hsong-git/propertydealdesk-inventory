import test from "node:test";
import assert from "node:assert/strict";

import { renderUnavailableShortcutHtml } from "./[code].js";

test("renders a public-safe unavailable page for deleted short links", () => {
  const html = renderUnavailableShortcutHtml("WTL0050");

  assert.match(html, /This property is no longer available/);
  assert.match(html, /sold, rented, withdrawn, or no longer available/);
  assert.match(html, /WTL0050/);
  assert.match(html, /Browse current listings/);
  assert.match(html, /Contact HS Ong/);
  assert.doesNotMatch(html, /Property shortcut not found/);
});
