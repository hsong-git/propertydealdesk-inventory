import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { normalizeInventoryFeed } from "./inventoryContract.js";
import { compareRecentlyUpdated, photoDownloadRequestText, postingFootnoteUrl, postingText, matchesInventoryFilter, normalizeInventoryFilter } from "../utils/listing.js";

const productionFeed = (listings) => ({
  schema: "propertydealdesk-public-inventory",
  schema_version: "1.0",
  inventoryVersion: "2026-07-27T01:30:00Z",
  generated_at: "2026-07-27T01:30:00Z",
  publishedAt: "2026-07-27T01:30:00Z",
  isMockData: false,
  listings,
});

const stableListing = {
  public_id: "public-wts1004",
  code: "WTS1004",
  intent: "WTS",
  slug: "wts1004-family-home-bukit-tinggi",
  title: "Family Home in Bukit Tinggi",
  property_type: "Terrace House",
  location: "Bukit Tinggi, Klang",
  price: 680000,
  bedroom_count: 4,
  bathroom_count: 3,
  built_up_sqft: 1900,
  availability: "Available",
  updated_at: "2026-07-27T01:20:00Z",
  cover_photo: "/inventory/WTS1004/cover.webp",
  photos: ["/inventory/WTS1004/cover.webp", "/inventory/WTS1004/living.webp"],
};

test("publication schema accepts explicit tenant eligibility without relaxing private-field protection", () => {
  const schema = JSON.parse(fs.readFileSync(new URL("../../public/data/inventory.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  for (const visibility of ["listed", "unlisted"]) {
    for (const eligibility of [true, false, null]) {
      const listing = { ...stableListing, visibility, accept_all_races: eligibility };
      assert.equal(validate(productionFeed([listing])), true, JSON.stringify(validate.errors));
      assert.equal(normalizeInventoryFeed(productionFeed([listing])).allItems[0].acceptAllRaces, eligibility);
    }
  }
  assert.equal(validate(productionFeed([stableListing])), true);
  assert.equal(validate(productionFeed([{ ...stableListing, accept_all_races: "NO" }])), false);
  assert.equal(validate(productionFeed([{ ...stableListing, owner_phone: "private" }])), false);
});

test("catalogue accepts only same-listing layout image paths", () => {
  const schema = JSON.parse(fs.readFileSync(new URL("../../public/data/inventory.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020();
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const path = "/inventory/WTS0001/layout-01.webp";
  const feed = productionFeed([{ ...stableListing, code: "WTS0001", layouts: [path] }]);
  assert.equal(validate(feed), true);
  assert.deepEqual(normalizeInventoryFeed(feed).allItems[0].layouts, [path]);
  for (const unsafe of ["/Documents/private.png", "/inventory/WTL0002/layout-01.webp", "/inventory/WTS0001/../private.webp"]) {
    assert.deepEqual(normalizeInventoryFeed(productionFeed([{ ...stableListing, code: "WTS0001", layouts: [unsafe] }])).allItems[0].layouts, []);
  }
});

test("catalogue accepts a same-listing AdPage as the main photo", () => {
  const schema = JSON.parse(fs.readFileSync(new URL("../../public/data/inventory.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020();
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const adPage = "/inventory/WTS1004/ad-page.webp";
  const listing = { ...stableListing, cover_photo: adPage, photos: [adPage, ...stableListing.photos], ad_page: adPage };
  assert.equal(validate(productionFeed([listing])), true, JSON.stringify(validate.errors));
  const normalized = normalizeInventoryFeed(productionFeed([listing])).allItems[0];
  assert.equal(normalized.adPage, adPage);
  assert.equal(normalized.photos[0], adPage);
  assert.equal(normalizeInventoryFeed(productionFeed([{ ...stableListing, ad_page: "/inventory/WTL9999/ad-page.webp" }])).allItems[0].adPage, null);
});

test("catalogue accepts safe listing videos without treating them as photos", () => {
  const path = "/inventory/WTS1004/video-" + "a".repeat(20) + ".mp4";
  const schema = JSON.parse(fs.readFileSync(new URL("../../public/data/inventory.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020();
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(productionFeed([{ ...stableListing, videos: [path] }])), true);
  for (const unsafe of ["/inventory/WTL9999/video-" + "a".repeat(20) + ".mp4", "https://example.com/private.mp4", "/inventory/WTS1004/../private.mp4"]) {
    assert.deepEqual(normalizeInventoryFeed(productionFeed([{ ...stableListing, videos: [unsafe] }])).allItems[0].videos, []);
  }
  const item = normalizeInventoryFeed(productionFeed([{ ...stableListing, videos: [path, path] }])).allItems[0];
  assert.deepEqual(item.videos, [path]);
  assert.ok(!item.photos.includes(path));
  assert.deepEqual(normalizeInventoryFeed(productionFeed([stableListing])).allItems[0].videos, []);
  assert.equal(validate(productionFeed([{ ...stableListing, videos: ["/Documents/private.mp4"] }])), false);
});

test("inventory toggle filters All, SMI and CMI independently of property intent", () => {
  const smi = { ...stableListing, visibility: "listed" };
  const cmi = { ...stableListing, visibility: "unlisted" };
  assert.equal(matchesInventoryFilter(smi, ""), true);
  assert.equal(matchesInventoryFilter(cmi, ""), true);
  assert.equal(matchesInventoryFilter(smi, "smi"), true);
  assert.equal(matchesInventoryFilter(cmi, "smi"), false);
  assert.equal(matchesInventoryFilter(cmi, "cmi"), true);
  assert.equal(matchesInventoryFilter(smi, "cmi"), false);
  assert.equal(normalizeInventoryFilter("invalid"), "");
});

test("unlisted CMI remains available by direct link but not browse, search or suggestions", () => {
  const hidden = { ...stableListing, code: "WTL0099", slug: "cmi-direct-link", visibility: "unlisted", cmi_agent_name: "Bee Ang", internal_note: "private" };
  const { items, allItems } = normalizeInventoryFeed(productionFeed([stableListing, hidden]));
  assert.deepEqual(items.map((item) => item.code), ["WTS1004"]);
  assert.deepEqual(normalizeInventoryFeed(productionFeed([stableListing, hidden]), { includeCmi: true }).items.map((item) => item.code), ["WTS1004", "WTL0099"]);
  assert.equal(allItems.find((item) => item.code === "WTL0099").visibility, "unlisted");
  assert.equal(allItems[1].displayCode, "CMI-WTL0099");
  assert.equal(allItems[1].cmiAgentName, "Bee Ang");
  assert.equal(normalizeInventoryFeed(productionFeed([{ ...stableListing, cmi_agent_name: "Private Owner" }])).items[0].cmiAgentName, null);
  assert.equal(items[0].displayCode, "WTS1004");
  assert.equal(allItems[1].slug, "cmi-direct-link");
  assert.match(postingText(allItems[1], { displayName: "HS Ong", phoneDisplay: "" }), /CMI-WTL0099/);
  const copy = postingText({ ...allItems[1], postingCopy: "*WTL0099*\nCMI-WTL0099\nhttps://property.myeviv.com/i/WTL0099" }, {});
  assert.match(copy, /\*CMI-WTL0099\*/);
  assert.doesNotMatch(copy, /CMI-CMI-/);
  assert.match(copy, /https:\/\/property\.myeviv\.com\/i\/WTL0099/);
  assert.equal(normalizeInventoryFeed(productionFeed([{ ...hidden, code: "CMI-WTL0099" }])).allItems[0].displayCode, "CMI-WTL0099");
  assert.equal("internal_note" in allItems[1], false);
  assert.equal(normalizeInventoryFeed(productionFeed([{ ...hidden, visibility: "invalid" }])).allItems.length, 0);
});

test("normalizes the Stable snake_case contract into the browser allowlist", () => {
  const raw = {
    ...stableListing,
    posting_copy: "Actual Stable SMI Copy\n\nPublic-safe owner-approved copy.",
    internal_note: "must never reach the browser model",
    contact_no: "private-number",
    database_id: 987,
  };
  const { items, meta } = normalizeInventoryFeed(productionFeed([raw]));
  assert.equal(items.length, 1);
  assert.equal(items[0].propertyType, "Terrace House");
  assert.equal(items[0].bedrooms, 4);
  assert.deepEqual(items[0].photos, stableListing.photos);
  assert.equal(items[0].postingCopy, "Actual Stable SMI Copy\n\nPublic-safe owner-approved copy.");
  assert.equal(meta.inventoryVersion, "2026-07-27T01:30:00Z");
  assert.equal("internal_note" in items[0], false);
  assert.equal("contact_no" in items[0], false);
  assert.equal("database_id" in items[0], false);
});

test("SMI posting removes stale CMI prefixes and uses the property domain", () => {
  const { items } = normalizeInventoryFeed(productionFeed([{ ...stableListing, visibility: "listed",
    posting_copy: "*CMI-WTS1004*\n\n🤝 Co-broke welcome\n🏠 Listing details & photos:\nhttps://scmi.myeviv.com/i/WTS1004" }]));
  assert.equal(items[0].displayCode, "WTS1004");
  const copy = postingText(items[0], {});
  assert.match(copy, /\*WTS1004\*/);
  assert.doesNotMatch(copy, /CMI-WTS1004|scmi\.myeviv/);
  assert.doesNotMatch(copy, /preview=/);
  assert.match(copy, /🤝 Co-broke welcome\n🏠 Listing details & photos:\nhttps:\/\/property\.myeviv\.com\/i\/WTS1004\?src=c1$/);
});

test("treats listings array membership as authoritative and accepts an empty feed", () => {
  const { items } = normalizeInventoryFeed(productionFeed([]));
  assert.deepEqual(items, []);
});

test("drops non-supply and closed records defensively from a production payload", () => {
  const nonSupplyRequest = { ...stableListing, code: "REQ1001", intent: "REQUEST" };
  const closedSupply = { ...stableListing, availability: "Closed" };
  const { items } = normalizeInventoryFeed(productionFeed([nonSupplyRequest, closedSupply]));
  assert.deepEqual(items, []);
});

test("drops photo paths outside the listing public inventory directory", () => {
  const raw = {
    ...stableListing,
    cover_photo: "C:\\private\\cover.webp",
    photos: ["/inventory/WTS9999/wrong.webp", "https://example.com/photo.webp"],
  };
  const { items } = normalizeInventoryFeed(productionFeed([raw]));
  assert.deepEqual(items[0].photos, []);
});

test("uses Stable-provided posting copy with one clean short-link footer", () => {
  const { items } = normalizeInventoryFeed(productionFeed([{
    ...stableListing,
    posting_copy: "Stable SMI Copy\nLine 2 exactly as approved.",
  }]));
  const text = postingText(items[0], {
    displayName: "HS Ong",
    renNumber: "REN 81340",
    phoneDisplay: "016-313 2865",
  });
  assert.equal(text, ["Stable SMI Copy", "Line 2 exactly as approved.", "", "🤝 Co-broke welcome", "🏠 Listing details & photos:", "https://property.myeviv.com/i/WTS1004?src=c1"].join("\n"));
});

test("accepts Stable schema 1.1 posting copy snapshots", () => {
  const { items, meta } = normalizeInventoryFeed({
    ...productionFeed([{ ...stableListing, posting_copy: "Stable 1.1 SMI Copy" }]),
    schema_version: "1.1",
  });
  assert.equal(meta.schemaVersion, "1.1");
  assert.equal(items[0].postingCopy, "Stable 1.1 SMI Copy");
});

test("accepts a WTSL listing and retains its alternate rental offer", () => {
  const { items, meta } = normalizeInventoryFeed({
    ...productionFeed([{
      ...stableListing,
      code: "WTSL0001",
      intent: "WTS",
      alternate_intent: "WTL",
      alternate_price: 2400,
      cover_photo: "/inventory/WTSL0001/cover.webp",
      photos: ["/inventory/WTSL0001/cover.webp"],
    }]),
    schema_version: "1.2",
  });
  assert.equal(meta.schemaVersion, "1.2");
  assert.equal(items[0].code, "WTSL0001");
  assert.equal(items[0].alternateIntent, "WTL");
  assert.equal(items[0].alternatePrice, 2400);
  assert.deepEqual(items[0].photos, ["/inventory/WTSL0001/cover.webp"]);
});

test("falls back to reconstructed posting details for old snapshots", () => {
  const { items } = normalizeInventoryFeed(productionFeed([stableListing]));
  const text = postingText(items[0], {
    displayName: "HS Ong",
    renNumber: "REN 81340",
    phoneDisplay: "016-313 2865",
  });
  assert.match(text, /^WTS \| WTS1004/m);
  assert.match(text, /Location: Bukit Tinggi, Klang/);
  assert.match(text, /Price: RM 680,000/);
  assert.match(text, /Contact HS Ong/);
  assert.doesNotMatch(text, /REN 81340/);
  assert.doesNotMatch(text, /preview=/);
  assert.match(text, /🤝 Co-broke welcome\n🏠 Listing details & photos:\nhttps:\/\/property\.myeviv\.com\/i\/WTS1004\?src=c1$/);
  assert.doesNotMatch(text, /database_id|contact_no|raw_json/);
});

test("normalizes duplicate posting footers to one clean short-link footer", () => {
  const footnote = [
    "🤝 Co-broke welcome",
    "🏠 Listing details & photos:",
    "https://property.myeviv.com/i/WTS1004",
  ].join("\n");
  const { items } = normalizeInventoryFeed(productionFeed([{
    ...stableListing,
    posting_copy: ["Stable SMI Copy", "", footnote, "", footnote].join("\n"),
  }]));
  const text = postingText(items[0], {
    displayName: "HS Ong",
    renNumber: "REN 81340",
    phoneDisplay: "016-313 2865",
  });
  assert.equal(text, ["Stable SMI Copy", "", "🤝 Co-broke welcome", "🏠 Listing details & photos:", "https://property.myeviv.com/i/WTS1004?src=c1"].join("\n"));
  assert.doesNotMatch(text, /preview=/);
  assert.equal(text.match(/Co-broke welcome/g).length, 1);
  assert.equal(text.match(/Listing details & photos:/g).length, 1);
  assert.doesNotMatch(text, /Download listing/i);
});

test("normalizes all footer wording variants without changing the posting body", () => {
  const body = "*WTS*\n\nProperty details\n\n*Furnishing Included*\n- Air Conditioners\n\n*AVAILABLE NOW!!!*\nContact HS ONG";
  const variants = ["Listing details & photos:", "Listing details & photos in:", "Listing details & photos from:", "Download listing details & photos from:", "Download listing details & photos in:"];
  for (const visibility of ["listed", "unlisted"]) for (const ending of ["\n", "\r\n"]) {
    const footers = variants.map((wording, index) => `🤝 Co-broke welcome${ending}🏠 ${wording}${ending}https://${index % 2 ? "scmi" : "property"}.myeviv.com/i/WTS1004?v=old`);
    const listing = { code:"WTS1004",intent:"WTS",visibility,postingCopy:[body,...footers].join(`${ending}${ending}`) };
    const text = postingText(listing, {});
    assert.equal(text, `${body}\n\n🤝 Co-broke welcome\n🏠 Listing details & photos:\n${postingFootnoteUrl(listing)}`);
    assert.equal(postingText({...listing,postingCopy:text},{}),text,"formatting is idempotent");
  }
});

test("all current SMI/CMI postings have exactly one non-download footer", () => {
  const feed = JSON.parse(fs.readFileSync(new URL("../../public/data/inventory.json", import.meta.url), "utf8"));
  const {allItems} = normalizeInventoryFeed(feed, {includeCmi:true});
  assert.ok(allItems.length > 0);
  for (const listing of allItems) {
    const text = postingText(listing, {displayName:"HS Ong",phoneDisplay:""});
    assert.equal((text.match(/Co-broke welcome/gi) || []).length,1,listing.code);
    assert.equal((text.match(/Listing details & photos/gi) || []).length,1,listing.code);
    assert.doesNotMatch(text,/Download listing details|Listing details & photos (?:in|from):/i,listing.code);
    assert.ok(text.endsWith(postingFootnoteUrl(listing)),listing.code);
  }
});

test("normalizes request-side posting footers to the property homepage", () => {
  const baseListing = {
    code: "WTR1006",
    intent: "WTR",
    title: "Tenant request in Klang",
    location: "Klang",
    features: [],
  };
  const text = postingText({
    ...baseListing,
    postingCopy: [
      "Stable request copy",
      "",
      "🤝 Co-broke welcome",
      "🏠 Listing details & photos:",
      "https://property.myeviv.com/i/WTR1006",
    ].join("\n"),
  }, {
    displayName: "HS Ong",
    renNumber: "REN 81340",
    phoneDisplay: "016-313 2865",
  });
  assert.equal(text, ["Stable request copy", "", "🤝 Co-broke welcome", "🏠 Listing details & photos:", "https://property.myeviv.com/?src=c1"].join("\n"));
  assert.doesNotMatch(text, /\/i\/WTR1006/);

  const oldHomepageText = postingText({
    ...baseListing,
    postingCopy: [
      "Stable request copy",
      "",
      "🤝 Co-broke welcome",
      "🏠 Listing details & photos:",
      "https://property.myeviv.com",
    ].join("\n"),
  }, {
    displayName: "HS Ong",
    renNumber: "REN 81340",
    phoneDisplay: "016-313 2865",
  });
  assert.equal(oldHomepageText, ["Stable request copy", "", "🤝 Co-broke welcome", "🏠 Listing details & photos:", "https://property.myeviv.com/?src=c1"].join("\n"));
});

test("posting footer URLs omit social preview parameters and always track WhatsApp", () => {
  assert.equal(postingFootnoteUrl({ code: "WTL0098", intent: "WTL", inventoryVersion: "2026.10.17.2", adPage: "/inventory/WTL0098/AdPage/poster.jpg" }), "https://property.myeviv.com/i/WTL0098?src=c1");
  assert.equal(postingFootnoteUrl({ code: "WTS1039", intent: "WTS", visibility: "unlisted", inventoryVersion: "2026.10.17.2" }), "https://scmi.myeviv.com/i/WTS1039?src=c1");
});

test("builds a photo-download WhatsApp request from public listing details", () => {
  const { items } = normalizeInventoryFeed(productionFeed([stableListing]));
  const text = photoDownloadRequestText(items[0], "HS Ong");
  assert.equal(text, [
    "Hi HS Ong, PM for photos.",
    "",
    "Property code: WTS1004",
    "Title: Family Home in Bukit Tinggi",
    "Location: Bukit Tinggi, Klang",
    "Price: RM 680,000",
  ].join("\n"));
});

test("orders by original listed date without publication timestamp priority", () => {
  const listings = [
    { code: "WTS0003", featured: false, listedAt: "2026-07-27T12:00:00Z", updatedAt: "2026-08-03T12:00:00Z" },
    { code: "WTS0001", featured: true, listedAt: "2026-07-25T12:00:00Z", updatedAt: "2026-08-03T12:00:00Z" },
    { code: "WTS0002", featured: true, listedAt: "2026-07-26T12:00:00Z", updatedAt: "2026-08-03T12:00:00Z" },
    { code: "WTS0004", featured: false, listedAt: "2026-07-28T09:15:00Z", updatedAt: "2026-08-03T12:00:00Z" },
  ];
  assert.deepEqual(
    listings.sort(compareRecentlyUpdated).map((item) => item.code),
    ["WTS0004", "WTS0003", "WTS0002", "WTS0001"],
  );
});
