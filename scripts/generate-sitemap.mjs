import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeInventoryFeed } from "../src/data/inventoryContract.js";
import { SITE_ORIGIN } from "../src/utils/seo.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const inventoryPath = path.join(projectRoot, "public", "data", "inventory.json");
const sitemapPath = path.join(projectRoot, "public", "sitemap.xml");

const xmlEscape = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const asDate = (value, fallback) => {
  const date = new Date(value || fallback || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
};

const payload = JSON.parse(await readFile(inventoryPath, "utf8"));
const { items, meta } = normalizeInventoryFeed(payload);
const fallbackLastMod = meta.publishedAt || meta.generatedAt;

const urls = [
  { loc: `${SITE_ORIGIN}/`, priority: "1.0", changefreq: "daily", lastmod: asDate(fallbackLastMod) },
  { loc: `${SITE_ORIGIN}/about`, priority: "0.6", changefreq: "monthly", lastmod: asDate(fallbackLastMod) },
  { loc: `${SITE_ORIGIN}/contact`, priority: "0.6", changefreq: "monthly", lastmod: asDate(fallbackLastMod) },
  ...items.map((listing) => ({
    loc: `${SITE_ORIGIN}/property/${listing.slug}`,
    priority: listing.featured ? "0.9" : "0.8",
    changefreq: "weekly",
    lastmod: asDate(listing.updatedAt, fallbackLastMod),
  })),
];

const body = urls.map((url) => [
  "  <url>",
  `    <loc>${xmlEscape(url.loc)}</loc>`,
  `    <lastmod>${xmlEscape(url.lastmod)}</lastmod>`,
  `    <changefreq>${xmlEscape(url.changefreq)}</changefreq>`,
  `    <priority>${xmlEscape(url.priority)}</priority>`,
  "  </url>",
].join("\n")).join("\n");

await writeFile(
  sitemapPath,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
);

console.log(`Generated public/sitemap.xml with ${urls.length} URLs for inventory ${meta.inventoryVersion}.`);
