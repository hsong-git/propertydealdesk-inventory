import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

function buildMode(mode) {
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
    import { normalizeInventoryFeed } from './src/data/inventoryContract.js';
    import { SITE_ORIGIN } from './src/utils/seo.js';
    import { postingText, listingShortUrl, listingDetailUrl } from './src/utils/listing.js';
    import { renderPropertyRouteHtml } from './scripts/property-og.mjs';
    import { renderCatalogueContent } from './scripts/catalogue-html.mjs';
    const base = { intent:'WTL', title:'Unit', location:'Klang', availability:'Available', photos:[] };
    const feed = { schema:'propertydealdesk-public-inventory', schema_version:'1.2', generated_at:'2026-10-09T00:00:00Z', listings:[
      {...base, code:'WTL0001', slug:'smi-unit'},
      {...base, code:'WTL0002', slug:'cmi-unit', visibility:'unlisted', cmi_agent_name:'Bee Ang'}
    ] };
    const {items,allItems} = normalizeInventoryFeed(feed);
    const cmi=allItems[1];
    console.log(JSON.stringify({origin:SITE_ORIGIN,codes:items.map(x=>x.code),
      smiShare:listingShortUrl(allItems[0]),smiDetail:listingDetailUrl(allItems[0]),
      cmiShare:listingShortUrl(cmi),smiPosting:postingText(allItems[0],{}),
      posting:postingText({...cmi,postingCopy:'*WTL0002*'},{}),
      html:renderPropertyRouteHtml('<html><head></head><body><div id="root"></div></body></html>',cmi,'.'),
      catalogue:renderCatalogueContent(items,{heading:'Inventory'})}));
  `], { cwd: new URL("..", import.meta.url), env: { ...process.env, VITE_CATALOGUE_MODE: mode }, encoding: "utf8" }));
}

test("SCMI build combines only exported SMI/CMI and keeps links on its own origin", () => {
  const result = buildMode("scmi");
  assert.equal(result.origin, "https://scmi.myeviv.com");
  assert.deepEqual(result.codes, ["WTL0001", "WTL0002"]);
  assert.equal(result.smiShare, "https://property.myeviv.com/i/WTL0001");
  assert.equal(result.smiDetail, "https://property.myeviv.com/property/smi-unit");
  assert.match(result.smiPosting, /https:\/\/property\.myeviv\.com\/i\/WTL0001/);
  assert.match(result.posting, /CMI-WTL0002/);
  assert.match(result.posting, /https:\/\/scmi\.myeviv\.com\/i\/WTL0002/);
  assert.match(result.html, /href="\/">Back to Catalogue/);
  assert.match(result.html, /Agent: Bee Ang/);
  assert.match(result.html, /https:\/\/scmi\.myeviv\.com\/property\/cmi-unit/);
  assert.doesNotMatch(result.catalogue, /CMI Units/);
  assert.match(result.catalogue, /inventory-badge-smi">SMI/);
  assert.match(result.catalogue, /inventory-badge-cmi">CMI/);
  assert.match(result.catalogue, /https:\/\/property\.myeviv\.com\/admin\/inquiries/);
});

test("property build remains SMI-only, with existing unlisted direct links", () => {
  const result = buildMode("");
  assert.equal(result.origin, "https://property.myeviv.com");
  assert.deepEqual(result.codes, ["WTL0001"]);
  assert.equal(result.smiShare, "https://property.myeviv.com/i/WTL0001");
  assert.equal(result.cmiShare, "https://scmi.myeviv.com/i/WTL0002");
  assert.match(result.html, /noindex, nofollow/);
  assert.doesNotMatch(result.catalogue, /CMI Units/);
});
