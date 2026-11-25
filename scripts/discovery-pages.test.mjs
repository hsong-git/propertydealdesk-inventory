import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { DISCOVERY_AREAS, getAreaListings, publishedAreas, areaSnapshot, areaStructuredData } from "../src/utils/areaDiscovery.js";
import { writeDiscoveryPages, discoveryLinks } from "./discovery-pages.mjs";

const area = DISCOVERY_AREAS[0];
const unit = (overrides = {}) => ({ code: "WTL0001", slug: "sample-unit", title: "Apartment in Bukit Tinggi", location: "Bukit Tinggi, Klang", propertyType: "Apartment", price: 1500, intent: "WTL", photos: [], features: [], furnishing: "Partial", createdAt: "2026-11-25T00:00:00Z", ...overrides });

test("area discovery uses catalogue location matching and excludes CMI unless approved", () => {
  const items = [unit(), unit({ code: "WTL0002", visibility: "unlisted" }), unit({ code: "WTS0003", title: "Home", location: "Elsewhere" })];
  assert.equal(getAreaListings(items, area).length, 1);
  assert.equal(getAreaListings(items, area, undefined, { includeCmi: true }).length, 2);
  const dictionary = { schema: "propertydealdesk-public-location-dictionary", locations: [{ label: "Bukit Tinggi", aliases: ["New Development"] }] };
  assert.equal(getAreaListings([unit({ title: "Unit", location: "New Development" })], area, dictionary).length, 1);
  assert.deepEqual(publishedAreas([], dictionary), []);
});

test("area snapshots count dual-intent properties once overall and never invent unknown prices", () => {
  const snapshot = areaSnapshot([unit({ alternateIntent: "WTS", alternatePrice: 500000 }), unit({ code: "WTL0002", price: 0 })]);
  assert.equal(snapshot.total, 2);
  assert.deepEqual(snapshot.rent, { count: 2, priced: 1, min: 1500, max: 1500 });
  assert.deepEqual(snapshot.sale, { count: 1, priced: 1, min: 500000, max: 500000 });
  assert.equal(areaSnapshot([]).rent.min, null);
});

test("curated pages render useful crawler-visible listings, real contact details and safe structured data", () => {
  const runtime = path.resolve(".runtime"); fs.mkdirSync(runtime, { recursive: true });
  const root = fs.mkdtempSync(path.join(runtime, "discovery-test-"));
  try {
    const item = unit({ title: "Bukit Tinggi </script><img src=x onerror=alert(1)>" });
    const items = [item, unit({ code: "WTL0099", title: "PRIVATE CMI EXAMPLE", visibility: "unlisted" })];
    const indexHtml = '<html><head><title>Default</title><meta name="description" content="Default"><meta name="robots" content="index, follow"><link rel="canonical" href="https://www.myeviv.com/"></head><body><div id="root"></div></body></html>';
    const slugs = writeDiscoveryPages({ indexHtml, distRoot: root, items, meta: { publishedAt: "2026-11-25T00:00:00Z" } });
    assert.deepEqual(slugs, ["bukit-tinggi"]);
    assert(!fs.existsSync(path.join(root, "areas", "setia-alam.html")));
    const html = fs.readFileSync(path.join(root, "areas", "bukit-tinggi.html"), "utf8");
    assert.match(html, /href="https:\/\/www\.myeviv\.com\/areas\/bukit-tinggi"/);
    assert.match(html, /\/property\/sample-unit/);
    assert.match(html, /RM 1,500/);
    assert.match(html, /not market valuations/);
    assert(!html.includes("PRIVATE CMI EXAMPLE"));
    assert(!html.includes("</script><img src=x"));
    const json = JSON.parse(html.match(/id="page-jsonld"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.equal(json[0].mainEntity.numberOfItems, 1);
    assert.equal(json[0].mainEntity.itemListElement[0].url, "https://www.myeviv.com/property/sample-unit");
    const contact = fs.readFileSync(path.join(root, "contact.html"), "utf8");
    assert.match(contact, /REN 81340/); assert.match(contact, /mailto:hsong@myeviv.com/); assert.match(contact, /tel:\+60163132865/);
    assert.match(fs.readFileSync(path.join(root, "about.html"), "utf8"), /The Roof Realty/);
    assert.match(discoveryLinks(items), /\/areas\/bukit-tinggi/);
    assert.match(discoveryLinks(items), /Browse by popular area/);
    assert.equal(areaStructuredData(area, [item], "https://www.myeviv.com")[1]["@type"], "BreadcrumbList");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
