import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { normalizeInventoryFeed } from "../src/data/inventoryContract.js";
import { listingShortUrl } from "../src/utils/listing.js";
import { propertyOgDescription, renderPropertyRouteHtml, summarizePostingCopy, prerenderPropertyOgRoutes } from "./property-og.mjs";
import { renderCatalogueContent } from "./catalogue-html.mjs";

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

test("unlisted detail and shortcut HTML retains details but opts out of indexing", () => {
  const { items, allItems } = normalizeInventoryFeed({ ...feed, listings: [{ ...feed.listings[0], visibility: "unlisted", photos: [], cover_photo: null }] });
  assert.equal(items.length, 0);
  const html = renderPropertyRouteHtml(shell, allItems[0], ".");
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /Family Home in Bukit Tinggi/);
});

test("prerender keeps CMI detail links but hides them from home, catalogue and SEO properties", async () => {
  const runtime = path.resolve(".runtime");
  fs.mkdirSync(runtime, { recursive: true });
  const root = fs.mkdtempSync(path.join(runtime, "unlisted-test-"));
  try {
    const publicRoot = path.join(root, "public");
    const distRoot = path.join(root, "dist");
    fs.mkdirSync(path.join(publicRoot, "data"), { recursive: true });
    fs.mkdirSync(path.join(distRoot, "data"), { recursive: true });
    const hidden = { ...feed.listings[0], code: "WTL0099", slug: "cmi-unlisted-only", title: "CMI Direct Link Test", visibility: "unlisted", cmi_agent_name: "Bee Ang", photos: [], cover_photo: null };
    const visible = { ...feed.listings[0], photos: [], cover_photo: null };
    fs.writeFileSync(path.join(publicRoot, "data", "inventory.json"), JSON.stringify({ ...feed, listings: [visible, hidden] }));
    fs.writeFileSync(path.join(distRoot, "index.html"), shell);
    await prerenderPropertyOgRoutes({ projectRoot: root, publicRoot, distRoot });
    assert.doesNotMatch(fs.readFileSync(path.join(distRoot, "index.html"), "utf8"), /CMI Direct Link Test/);
    assert.doesNotMatch(fs.readFileSync(path.join(distRoot, "catalogue", "page", "1", "index.html"), "utf8"), /CMI Direct Link Test/);
    for (const route of [path.join("property", hidden.slug), path.join("i", hidden.code)]) {
      const html = fs.readFileSync(path.join(distRoot, route, "index.html"), "utf8");
      assert.match(html, /CMI Direct Link Test/);
      assert.match(html, /CMI-WTL0099/);
      assert.match(html, /href="\/cmi">Back to CMI Catalogue/);
      assert.match(html, /Agent: Bee Ang/);
      assert.match(html, /noindex, nofollow/);
    }
    const shortcutHtml = fs.readFileSync(path.join(distRoot, "i", hidden.code, "index.html"), "utf8");
    assert.match(shortcutHtml, /<meta property="og:url" content="https:\/\/scmi\.myeviv\.com\/i\/WTL0099\?v=2026\.07\.29\.1&amp;preview=7" \/>/);
    assert.doesNotMatch(shortcutHtml, /property\.myeviv\.com\/i\/CMI-WTL0099/);
    const manifest = JSON.parse(fs.readFileSync(path.join(distRoot, "data", "seo-routes.json"), "utf8"));
    assert.deepEqual(manifest.properties, [visible.slug]);
    assert.deepEqual(manifest.unlistedProperties, [hidden.slug]);
    assert.equal(manifest.cataloguePages, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

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
    assert.match(html, /<meta property="og:image:secure_url" content="https:\/\/property\.myeviv\.com\/inventory\/WTS1004\/cover\.webp" \/>/);
    assert.match(html, /<meta property="og:image:alt" content="WTS1004 Family Home in Bukit Tinggi property photo" \/>/);
    assert.doesNotMatch(html, /database_id|raw_json|internal_note|60163132865/);
    assert.match(shortHtml, /<link rel="canonical" href="https:\/\/property\.myeviv\.com\/property\/wts1004-family-home-bukit-tinggi" \/>/);
    assert.match(shortHtml, /<meta property="og:url" content="https:\/\/property\.myeviv\.com\/i\/WTS1004" \/>/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("uses AdPage for crawler OG image and visible main image", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pdd-adpage-og-"));
  try {
    fs.mkdirSync(path.join(directory, "inventory", "WTS1004"), { recursive: true });
    fs.writeFileSync(path.join(directory, "inventory", "WTS1004", "ad-page.webp"), webp());
    const adPage = "/inventory/WTS1004/ad-page.webp";
    const { items } = normalizeInventoryFeed({
      ...feed,
      schema_version: "1.3",
      listings: [{ ...feed.listings[0], cover_photo: adPage, photos: [adPage, ...feed.listings[0].photos], ad_page: adPage }],
    });
    const html = renderPropertyRouteHtml(shell, items[0], directory);
    assert.match(html, /<meta property="og:image" content="https:\/\/property\.myeviv\.com\/inventory\/WTS1004\/ad-page\.webp" \/>/);
    assert.match(html, /<img src="\/inventory\/WTS1004\/ad-page\.webp"/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("preserves the complete AdPage inside Facebook's 1200 by 630 preview", async () => {
  sharp.cache(false);
  const runtime = path.resolve(".runtime");
  fs.mkdirSync(runtime, { recursive: true });
  const root = fs.mkdtempSync(path.join(runtime, "adpage-social-preview-"));
  try {
    const publicRoot = path.join(root, "public");
    const distRoot = path.join(root, "dist");
    const adPage = "/inventory/WTS1004/ad-page.webp";
    fs.mkdirSync(path.join(publicRoot, "data"), { recursive: true });
    fs.mkdirSync(path.join(publicRoot, "inventory", "WTS1004"), { recursive: true });
    fs.mkdirSync(path.join(distRoot, "data"), { recursive: true });
    await sharp({ create: { width: 1080, height: 720, channels: 3, background: { r: 180, g: 30, b: 20 } } })
      .webp()
      .toFile(path.join(publicRoot, adPage.replace(/^\//, "")));
    fs.writeFileSync(path.join(publicRoot, "data", "inventory.json"), JSON.stringify({
      ...feed,
      schema_version: "1.3",
      listings: [{ ...feed.listings[0], ad_page: adPage, cover_photo: adPage, photos: [adPage] }],
    }));
    fs.writeFileSync(path.join(distRoot, "index.html"), shell);

    await prerenderPropertyOgRoutes({ projectRoot: root, publicRoot, distRoot });

    const html = fs.readFileSync(path.join(distRoot, "i", "WTS1004", "index.html"), "utf8");
    const match = html.match(/<meta property="og:image" content="https:\/\/property\.myeviv\.com(\/og\/properties\/[^"]+)" \/>/);
    assert.ok(match);
    assert.match(match[1], /-v7\.jpg$/);
    const socialImagePath = path.join(distRoot, match[1].replace(/^\//, ""));
    const metadata = await sharp(socialImagePath).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.equal(metadata.format, "jpeg");
    assert.equal(metadata.chromaSubsampling, "4:4:4");
    assert.ok(fs.statSync(socialImagePath).size < 300 * 1024, "the WhatsApp preview image should stay below 300 KB");
    const { data, info } = await sharp(socialImagePath).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    assert.ok(pixel(10, 315)[0] > 140 && pixel(10, 315)[1] < 70, "the AdPage should fill the left edge without a border");
    assert.ok(pixel(600, 5)[0] > 140 && pixel(600, 5)[1] < 70, "the AdPage top edge should remain visible");
    assert.ok(pixel(600, 624)[0] > 140 && pixel(600, 624)[1] < 70, "the AdPage bottom edge should remain visible");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("uses stable short URL format for share actions", () => {
  const { items } = normalizeInventoryFeed(feed);
  assert.equal(listingShortUrl(items[0]), "https://property.myeviv.com/i/WTS1004");
  assert.equal(
    listingShortUrl({ ...items[0], adPage: "/inventory/WTS1004/AdPage/poster.jpg" }),
    "https://property.myeviv.com/i/WTS1004?v=2026.07.29.1&preview=7",
  );
  assert.match(propertyOgDescription(items[0]), /Family Home/);
});

test("versions CMI short URLs so social crawlers fetch a fresh preview", () => {
  const { allItems } = normalizeInventoryFeed({
    ...feed,
    listings: [{ ...feed.listings[0], visibility: "unlisted" }],
  }, { includeCmi: true });
  assert.equal(
    listingShortUrl(allItems[0]),
    "https://scmi.myeviv.com/i/WTS1004?v=2026.07.29.1&preview=7",
  );
});

test("paginated catalogue uses the shared site theme and crawlable navigation", () => {
  const { items } = normalizeInventoryFeed(feed);
  const html = renderCatalogueContent(items, { heading: "Property Inventory Catalogue — Page 2", page: 2, pageCount: 3, total: 30 });
  for (const className of ["site-shell static-catalogue", "site-header", "brand-link", "section-heading", "property-reference", "property-location", "property-price", "property-facts", "property-meta", "property-actions view-only", "site-footer"]) {
    assert.ok(html.includes(`class="${className}"`), className);
  }
  assert.match(html, /<h1>Property Inventory Catalogue — Page 2<\/h1>/);
  assert.match(html, /<h3><a href="\/property\/wts1004-family-home-bukit-tinggi\?intent=WTS">/);
  assert.match(html, /intent-wts/);
  assert.match(html, /\/watermarked\/color-logo-30-jpg-v3\/inventory\/WTS1004\/cover.jpg/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /rel="prev" href="\/catalogue\/page\/1\/"/);
  assert.match(html, /rel="next" href="\/catalogue\/page\/3\/"/);
  assert.doesNotMatch(html, /watermark-overlay|style="width:100%;height:auto"/);
});
