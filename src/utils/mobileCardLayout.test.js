import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { propertyEnquiryTarget, propertyInterest, propertyInterestLines } from "./propertyEnquiry.js";
import { normalizeRequirementPayload } from "../data/requirementContract.js";

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

test("mobile filters shrink controls and wrap actions instead of widening the drawer", () => {
  assert.match(css, /\.filter-grid > \*, \.filter-grid input, \.filter-grid select \{ min-width: 0;/);
  assert.match(mobile, /\.filter-footer \{[^}]*flex-wrap: wrap/);
  assert.match(mobile, /\.advanced-filter-shell \{[^}]*max-height: 88dvh/);
  const filters = fs.readFileSync(new URL("../components/CatalogueFilters.jsx", import.meta.url), "utf8");
  assert.match(filters, /className="reset-button home-reset-filters"[^>]*onClick=\{onReset\}/);
});

test("photo viewer resizes with the viewport and expands photos without cropping on rotation", () => {
  assert.match(css, /\.photo-lightbox \{[^}]*height: 100dvh/);
  assert.match(css, /\.lightbox-image \.watermarked-image > img \{ width: 100%; height: 100%; object-fit: contain;/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 600px\)/);
  assert.doesNotMatch(css, /max-height: calc\(100vh - 138px\)/);
});

test("location pills cannot force a second flex column on mobile", () => {
  assert.match(css, /\.all-location-links > span \{ flex-basis: auto; \}/);
  assert.match(css, /\.area-discovery-links\.all-location-links \{ display: grid; grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.all-location-links a \{ max-width: 100%; white-space: normal; overflow-wrap: anywhere;/);
});

test("location pills use equal-width columns and equal-height rows with wrapped labels", () => {
  assert.match(css, /\.all-location-links \.area-discovery-pills \{ display: grid;[^}]*grid-auto-rows: 1fr;/);
  assert.match(css, /\.all-location-links \.area-discovery-pills \{ min-width: 0; max-width: 100%; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.all-location-links \.area-discovery-pills > a \{[^}]*min-height: 56px;[^}]*white-space: normal;/);
});

test("property enquiry dock reserves bottom space and uses the current listing enquiry", () => {
  const page = fs.readFileSync(new URL("../pages/PropertyPage.jsx", import.meta.url), "utf8");
  assert.match(page, /enquireOnWhatsApp\("detail_floating"\)/);
  assert.match(page, /message: enquiryText\(listing, agentProfile.displayName, \{ intent: displayIntent \}\)/);
  assert.match(css, /body:has\(\.property-page\) \{ padding-bottom: calc\(76px/);
});

test("first-time enquiries carry trusted inventory details through saved requirements and messages", () => {
  const listing = { code: "WTL0116", title: "Example home", slug: "example-home", intent: "WTL", alternateIntent: "WTS" };
  const target = propertyEnquiryTarget(listing, "WTS");
  assert.equal(target, "/inquiries?property=example-home&intent=WTS");
  const interest = propertyInterest([listing], "example-home", "WTS", "https://www.myeviv.com");
  const normalized = normalizeRequirementPayload({ requirements: interest });
  assert.equal(normalized.requirements.interestCode, listing.code);
  assert.equal(normalized.requirements.interestTitle, listing.title);
  assert.equal(normalized.requirements.interestUrl, "https://www.myeviv.com/property/example-home?intent=WTS");
  assert.ok(propertyInterestLines(normalized.requirements).join("\n").includes(interest.interestUrl));
  assert.deepEqual(propertyInterestLines(normalized.requirements), [
    "*Property code:* WTL0116",
    "*Property title:* Example home",
    "*Property URL:* https://www.myeviv.com/property/example-home?intent=WTS",
  ]);
  const workflow = fs.readFileSync(new URL("../pages/RequirementPage.jsx", import.meta.url), "utf8");
  assert.match(workflow, /\*Looking to:[\s\S]*?\.\.\.propertyInterestLines\(requirements\),\s*"",\s*`\*Name:\*/);
  assert.equal(propertyInterest([listing], "missing", "WTL", "https://property.myeviv.com"), null);
  assert.equal(normalizeRequirementPayload({ requirements: { ...interest, interestUrl: "javascript:alert(1)" } }).requirements.interestUrl, "");
});
