import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../styles/site.css", import.meta.url), "utf8");
const responsive760Start = css.lastIndexOf("@media (max-width: 760px)");
const responsive480Start = css.lastIndexOf("@media (max-width: 480px)");
const mobile = css.slice(responsive760Start, responsive480Start);
const folded = css.slice(responsive480Start, css.indexOf("/* Requirement wizard UX refresh", responsive480Start));

test("mobile catalogue keeps photo-first tiles across folded and unfolded widths", () => {
  assert.ok(responsive760Start >= 0 && responsive480Start > responsive760Start);
  assert.match(mobile, /\.property-grid \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); gap: 12px; \}/);
  assert.match(mobile, /\.property-card \{ display: flex; flex-direction: column; align-items: stretch; \}/);
  assert.match(mobile, /\.property-photo \{ width: 100%; height: auto; min-height: 0; aspect-ratio: 16\/10;/);
  assert.doesNotMatch(mobile, /grid-template-columns: 154px minmax\(0,1fr\)/);
});

test("folded phones use one large tile and retain the full enquiry action", () => {
  assert.ok(responsive480Start >= 0 && folded.length > 0);
  assert.match(folded, /\.property-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(folded, /\.property-photo \{ width: 100%; height: auto; aspect-ratio: 16\/10; \}/);
  assert.match(folded, /\.icon-only-mobile span \{ display: inline; \}/);
});
