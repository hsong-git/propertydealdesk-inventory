import fs from "node:fs";
import path from "node:path";
import { normalizeInventoryFeed } from "../src/data/inventoryContract.js";
import { formatPrice } from "../src/utils/listing.js";
import { absoluteUrl, defaultSeo, propertySeoDescription, SITE_ORIGIN } from "../src/utils/seo.js";
import { inspectPublicImage } from "./image-policy.mjs";

const OG_DESCRIPTION_LIMIT = 210;
const CONTACT_LINE_PATTERN = /^(contact|whatsapp|phone|tel|mobile|email)\b/i;
const PHONE_LIKE_PATTERN = /(?:\+?6?01[\d\s-]{7,})/i;

export const htmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const collapseWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const stripMarkdown = (value) => collapseWhitespace(String(value ?? "")
  .replace(/https?:\/\/\S+/gi, "")
  .replace(/[*_`~#>]+/g, "")
  .replace(/^-+\s*/g, "")
  .replace(/\s+-\s+/g, " - "));

const truncateSentence = (value, limit = OG_DESCRIPTION_LIMIT) => {
  const cleaned = collapseWhitespace(value);
  if (cleaned.length <= limit) return cleaned;
  const clipped = cleaned.slice(0, limit + 1);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf(" - "), clipped.lastIndexOf(", "));
  const safeEnd = sentenceEnd > 90 ? sentenceEnd + 1 : limit;
  return `${cleaned.slice(0, safeEnd).trim().replace(/[.,;:-]+$/, "")}…`;
};

export function summarizePostingCopy(value) {
  if (!value) return "";
  const lines = [];
  for (const rawLine of String(value).split(/\r?\n/)) {
    const line = stripMarkdown(rawLine);
    if (!line) continue;
    if (CONTACT_LINE_PATTERN.test(line) || PHONE_LIKE_PATTERN.test(line)) break;
    if (/^property details$/i.test(line)) continue;
    lines.push(line);
    if (lines.join(" ").length >= OG_DESCRIPTION_LIMIT) break;
  }
  return truncateSentence(lines.join(". "));
}

export function propertyOgDescription(listing) {
  const fromPostingCopy = summarizePostingCopy(listing.postingCopy);
  const fallback = listing.description || propertySeoDescription(listing, formatPrice(listing.price, listing.intent));
  return truncateSentence(fromPostingCopy || fallback);
}

export function propertyOgImage(listing, publicRoot) {
  const relativeImage = listing.photos?.[0] || defaultSeo.image;
  const absoluteImage = absoluteUrl(relativeImage);
  if (absoluteImage === defaultSeo.image) {
    return {
      url: defaultSeo.image,
      width: defaultSeo.imageWidth,
      height: defaultSeo.imageHeight,
      type: defaultSeo.imageType,
    };
  }

  const filePath = path.join(publicRoot, relativeImage.replace(/^\//, ""));
  const details = inspectPublicImage(filePath);
  return {
    url: absoluteImage,
    width: details.width ? String(details.width) : "",
    height: details.height ? String(details.height) : "",
    type: details.format === "webp" ? "image/webp" : `image/${details.format}`,
  };
}

function replaceTag(html, selectorPattern, replacement) {
  return selectorPattern.test(html)
    ? html.replace(selectorPattern, replacement)
    : html.replace("</head>", `    ${replacement}\n  </head>`);
}

export function propertyOgMeta(listing, publicRoot) {
  const title = `${listing.code} ${listing.title} | HS Ong Property Inventory`;
  const canonical = `${SITE_ORIGIN}/property/${listing.slug}`;
  const description = propertyOgDescription(listing);
  const image = propertyOgImage(listing, publicRoot);
  return {
    title,
    canonical,
    description,
    ogUrl: canonical,
    ogTitle: `${listing.code} ${listing.title}`,
    ogDescription: description,
    ogType: "article",
    image,
  };
}

export function renderPropertyRouteHtml(indexHtml, listing, publicRoot, { canonicalOverride, ogUrlOverride } = {}) {
  const meta = propertyOgMeta(listing, publicRoot);
  if (canonicalOverride) meta.canonical = canonicalOverride;
  if (ogUrlOverride) meta.ogUrl = ogUrlOverride;
  let html = indexHtml;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(meta.title)}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${htmlEscape(meta.description)}" />`);
  html = replaceTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${htmlEscape(meta.canonical)}" />`);
  html = replaceTag(html, /<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${htmlEscape(meta.ogType)}" />`);
  html = replaceTag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${htmlEscape(meta.ogUrl)}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${htmlEscape(meta.ogTitle)}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${htmlEscape(meta.ogDescription)}" />`);
  html = replaceTag(html, /<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${htmlEscape(meta.image.url)}" />`);
  html = replaceTag(html, /<meta property="og:image:width" content="[^"]*"\s*\/?>/i, `<meta property="og:image:width" content="${htmlEscape(meta.image.width)}" />`);
  html = replaceTag(html, /<meta property="og:image:height" content="[^"]*"\s*\/?>/i, `<meta property="og:image:height" content="${htmlEscape(meta.image.height)}" />`);
  html = replaceTag(html, /<meta property="og:image:type" content="[^"]*"\s*\/?>/i, `<meta property="og:image:type" content="${htmlEscape(meta.image.type)}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${htmlEscape(meta.ogTitle)}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${htmlEscape(meta.ogDescription)}" />`);
  html = replaceTag(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${htmlEscape(meta.image.url)}" />`);
  return html;
}

export function prerenderPropertyOgRoutes({ projectRoot, publicRoot, distRoot }) {
  const inventory = JSON.parse(fs.readFileSync(path.join(publicRoot, "data", "inventory.json"), "utf8"));
  const { items, meta } = normalizeInventoryFeed(inventory);
  const indexHtml = fs.readFileSync(path.join(distRoot, "index.html"), "utf8");

  for (const listing of items) {
    const propertyRouteDirectory = path.join(distRoot, "property", listing.slug);
    fs.mkdirSync(propertyRouteDirectory, { recursive: true });
    const listingHtml = renderPropertyRouteHtml(indexHtml, listing, publicRoot);
    fs.writeFileSync(
      path.join(propertyRouteDirectory, "index.html"),
      listingHtml,
    );

    const shortRouteDirectory = path.join(distRoot, "i", listing.code);
    fs.mkdirSync(shortRouteDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(shortRouteDirectory, "index.html"),
      renderPropertyRouteHtml(indexHtml, listing, publicRoot, {
        ogUrlOverride: `${SITE_ORIGIN}/i/${listing.code}`,
      }),
    );
  }

  return { count: items.length, inventoryVersion: meta.inventoryVersion, projectRoot };
}
