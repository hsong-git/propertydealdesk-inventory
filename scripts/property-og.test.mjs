import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { normalizeInventoryFeed } from "../src/data/inventoryContract.js";
import { listingShortUrl } from "../src/utils/listing.js";
import { propertyOgDescription, renderPropertyRouteHtml, summarizePostingCopy } from "./property-og.mjs";

const chunk = (type, data) => {
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};

const webp = () => {
  const vp8x = Buffer.alloc(10);
  vp8x.writeUIntLE(1199, 4, 3);
  vp8x.writeUIntLE(629, 7, 3);
  const body = chunk("VP8X", vp8x);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
};

const shell = `<!doctype html>
<html lang="en">
  <head>
    <title>Default</title>
    <meta name="description" content="Default description" />
    <link rel="canonical" href="https://property.myeviv.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://property.myeviv.com/" />
    <meta property="og:title" content="Default OG" />
    <meta property="og:description" content="Default OG description" />
    <meta property="og:image" content="https://property.myeviv.com/og/property-inventory-card-white.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Default Twitter" />
    <meta name="twitter:description" content="Default Twitter description" />
    <meta name="twitter:image" content="https://property.myeviv.com/og/property-inventory-card-white.png" />
  </head>
  <body><div id="root"></div></body>
</html>`;

const feed = {
  schema: "propertydealdesk-public-inventory",
  schema_version: "1.1",
  inventoryVersion: "2026.07.29.1",
  generated_at: "2026-07-29T01:00:00Z",
  publishedAt: "2026-07-29T01:00:00Z",
  isMockData: false,
  listings: [{
    public_id: "pub_test_wts1004",
    code: "WTS1004",
    intent: "WTS",
    slug: "wts1004-family-home-bukit-tinggi",
    title: "Family Home in Bukit Tinggi",
    property_type: "Terrace House",
    location: "Bukit Tinggi, Klang",
    price: 680000,
    description: "Terrace House in Bukit Tinggi, Klang for RM 680,000 - Available",
    availability: "Available",
    updated_at: "2026-07-29T01:00:00Z",
    cover_photo: "/inventory/WTS1004/cover.webp",
    photos: ["/inventory/WTS1004/cover.webp"],
    posting_copy: "*WTS*\n\n*Family Home @ Bukit Tinggi*\nPrice *RM680,000*\n\n- Renovated kitchen\n- Near shops\n\nContact\n*HS ONG*\n*60163132865*",
  }],
};

test("summarizes Stable posting copy without contact details", () => {
  const summary = summarizePostingCopy(feed.listings[0].posting_copy);
  assert.match(summary, /Family Home/);
  assert.match(summary, /Renovated kitchen/);
  assert.doesNotMatch(summary, /60163132865|Contact|WhatsApp/);
});

test("renders crawler-visible property OG tags from public listing data", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pdd-property-og-"));
  try {
    fs.mkdirSync(path.join(directory, "inventory", "WTS1004"), { recursive: true });
    fs.writeFileSync(path.join(directory, "inventory", "WTS1004", "cover.webp"), webp());
    const { items } = normalizeInventoryFeed(feed);
    const html = renderPropertyRouteHtml(shell, items[0], directory);
    const shortHtml = renderPropertyRouteHtml(shell, items[0], directory, {
      ogUrlOverride: "https://property.myeviv.com/i/WTS1004",
    });
    assert.match(html, /<title>WTS1004 Family Home in Bukit Tinggi \| HS Ong Property Inventory<\/title>/);
    assert.match(html, /<meta property="og:type" content="article" \/>/);
    assert.match(html, /<meta property="og:url" content="https:\/\/property\.myeviv\.com\/property\/wts1004-family-home-bukit-tinggi" \/>/);
    assert.match(html, /<meta property="og:image" content="https:\/\/property\.myeviv\.com\/inventory\/WTS1004\/cover\.webp" \/>/);
    assert.match(html, /<meta property="og:image:width" content="1200" \/>/);
    assert.match(html, /<meta property="og:image:height" content="630" \/>/);
    assert.match(html, /<meta property="og:image:type" content="image\/webp" \/>/);
    assert.doesNotMatch(html, /database_id|raw_json|internal_note|60163132865/);
    assert.match(shortHtml, /<link rel="canonical" href="https:\/\/property\.myeviv\.com\/property\/wts1004-family-home-bukit-tinggi" \/>/);
    assert.match(shortHtml, /<meta property="og:url" content="https:\/\/property\.myeviv\.com\/i\/WTS1004" \/>/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("uses stable short URL format for share actions", () => {
  const { items } = normalizeInventoryFeed(feed);
  assert.equal(listingShortUrl(items[0]), "https://property.myeviv.com/i/WTS1004");
  assert.match(propertyOgDescription(items[0]), /Family Home/);
});
