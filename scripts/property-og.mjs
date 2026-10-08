import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { normalizeInventoryFeed } from "../src/data/inventoryContract.js";
import { COMBINED_CATALOGUE } from "../src/config/catalogueSite.js";
import { formatPrice } from "../src/utils/listing.js";
import { absoluteUrl, defaultSeo, propertyBreadcrumbs, propertyJsonLd, propertySeoDescription, SITE_ORIGIN } from "../src/utils/seo.js";
import { inspectPublicImage } from "./image-policy.mjs";
import { propertyPhotoWatermark } from "../src/config/watermark.js";
import { renderCatalogueContent } from "./catalogue-html.mjs";

const OG_DESCRIPTION_LIMIT = 210;
const CONTACT_LINE_PATTERN = /^(contact|whatsapp|phone|tel|mobile|email)\b/i;
const PHONE_LIKE_PATTERN = /(?:\+?6?01[\d\s-]{7,})/i;

export const htmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const staticPhoto = (src, alt, lazy = false) => `<span class="watermarked-image has-browser-watermark" style="--watermark-opacity:${propertyPhotoWatermark.opacity};max-width:100%"><img src="${htmlEscape(src)}" alt="${htmlEscape(alt)}" ${lazy ? 'loading="lazy"' : ""} style="width:100%;height:auto"><span class="watermark-overlay" aria-hidden="true"><img class="watermark-logo" src="${htmlEscape(propertyPhotoWatermark.logo)}" alt=""></span></span>`;

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

export function propertyOgImage(listing, publicRoot, imageOverride = null) {
  if (imageOverride) return imageOverride;
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
  const title = `${listing.displayCode || listing.code} ${listing.title} | HS Ong Property Inventory`;
  const canonical = `${SITE_ORIGIN}/property/${listing.slug}`;
  const description = propertyOgDescription(listing);
  const image = propertyOgImage(listing, publicRoot);
  return {
    title,
    canonical,
    description,
    ogUrl: canonical,
    ogTitle: `${listing.displayCode || listing.code} ${listing.title}`,
    ogDescription: description,
    ogType: "article",
    image,
    imageAlt: `${listing.displayCode || listing.code} ${listing.title} property photo`,
  };
}

export function renderPropertyRouteHtml(indexHtml, listing, publicRoot, { canonicalOverride, ogUrlOverride, imageOverride } = {}) {
  const meta = propertyOgMeta(listing, publicRoot);
  if (imageOverride) meta.image = imageOverride;
  if (canonicalOverride) meta.canonical = canonicalOverride;
  if (ogUrlOverride) meta.ogUrl = ogUrlOverride;
  let html = indexHtml;
  html = replaceTag(html, /<meta name="robots" content="[^"]*"\s*\/?>/i, `<meta name="robots" content="${listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "noindex, nofollow" : "index, follow"}" />`);
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
  html = replaceTag(html, /<meta property="og:image:secure_url" content="[^"]*"\s*\/?>/i, `<meta property="og:image:secure_url" content="${htmlEscape(meta.image.url)}" />`);
  html = replaceTag(html, /<meta property="og:image:alt" content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${htmlEscape(meta.imageAlt)}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${htmlEscape(meta.ogTitle)}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${htmlEscape(meta.ogDescription)}" />`);
  html = replaceTag(html, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${htmlEscape(meta.image.url)}" />`);
  const photo = listing.photos[0];
  const content = `<main class="page-width property-page"><a href="${listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "/cmi" : "/"}">${listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "Back to CMI Catalogue" : "Back to Catalogue"}</a><section class="detail-title-block"><p>${htmlEscape(listing.displayCode || listing.code)} · ${htmlEscape(listing.availability)}</p><h1>${htmlEscape(listing.title)}</h1><p>${htmlEscape(listing.location)}</p><div class="detail-price-row"><strong class="detail-price">${htmlEscape(formatPrice(listing.price, listing.intent))}</strong>${listing.cmiAgentName ? `<small class="detail-cmi-agent">Agent: ${htmlEscape(listing.cmiAgentName)}</small>` : ""}</div>${listing.alternateIntent && listing.alternatePrice != null ? `<p>Also available to ${listing.alternateIntent === "WTL" ? "rent" : "buy"}: ${htmlEscape(formatPrice(listing.alternatePrice, listing.alternateIntent))}</p>` : ""}</section>${photo ? `<img src="${htmlEscape(photo)}" alt="${htmlEscape(listing.title)}" style="max-width:100%;height:auto">` : ""}<section class="detail-section"><h2>Property overview</h2><p>${htmlEscape(listing.description)}</p><dl>${[["Property type", listing.propertyType], ["Bedrooms", listing.bedrooms], ["Bathrooms", listing.bathrooms], ["Built-up (sq ft)", listing.builtUpSqFt], ["Land size", listing.landSize], ["Furnishing", listing.furnishing]].filter(([, value]) => value != null).map(([label, value]) => `<dt>${label}</dt><dd>${htmlEscape(value)}</dd>`).join("")}</dl><h2>Property features</h2><ul>${listing.features.map((feature) => `<li>${htmlEscape(feature)}</li>`).join("")}</ul><a href="/inquiries">Find a property for me</a></section></main>`;
  html = html.replace('<div id="root"></div>', `<div id="root">${photo ? content.replace(`<img src="${htmlEscape(photo)}" alt="${htmlEscape(listing.title)}" style="max-width:100%;height:auto">`, staticPhoto(photo, listing.title)) : content}</div>`);
  const structuredData = JSON.stringify([propertyJsonLd(listing), propertyBreadcrumbs(listing)]).replaceAll("<", "\\u003c");
  html = html.replace("</head>", `<script id="page-jsonld" type="application/ld+json">${structuredData}</script></head>`);
  return html;
}

async function createPropertyOgImage(listing, publicRoot, distRoot, inventoryVersion) {
  const source = listing.cover_photo || listing.photos?.[0];
  if (!source) return null;
  const sourcePath = path.join(publicRoot, source.replace(/^\//, ""));
  if (!fs.existsSync(sourcePath)) return null;
  const code = String(listing.code || "listing").toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
  const version = String(inventoryVersion || "current").replace(/[^A-Za-z0-9._-]/g, "-");
  const relativePath = `/og/properties/${code}-${version}.jpg`;
  const destination = path.join(distRoot, relativePath.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(destination);
  return { url: `${SITE_ORIGIN}${relativePath}`, width: "1200", height: "630", type: "image/jpeg" };
}

export async function prerenderPropertyOgRoutes({ projectRoot, publicRoot, distRoot }) {
  const inventory = JSON.parse(fs.readFileSync(path.join(publicRoot, "data", "inventory.json"), "utf8"));
  const { items, allItems, meta } = normalizeInventoryFeed(inventory);
  const indexHtml = fs.readFileSync(path.join(distRoot, "index.html"), "utf8").replace(/<!--seo-content-start-->[\s\S]*?<!--seo-content-end-->/g, "").replaceAll("https://property.myeviv.com", SITE_ORIGIN);

  for (const listing of allItems) {
    const imageOverride = await createPropertyOgImage(listing, publicRoot, distRoot, meta.inventoryVersion);
    const propertyRouteDirectory = path.join(distRoot, "property", listing.slug);
    fs.mkdirSync(propertyRouteDirectory, { recursive: true });
    const listingHtml = renderPropertyRouteHtml(indexHtml, listing, publicRoot, { imageOverride });
    fs.writeFileSync(
      path.join(propertyRouteDirectory, "index.html"),
      listingHtml,
    );

    const shortRouteDirectory = path.join(distRoot, "i", listing.code);
    fs.mkdirSync(shortRouteDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(shortRouteDirectory, "index.html"),
      renderPropertyRouteHtml(indexHtml, listing, publicRoot, {
        imageOverride,
        ogUrlOverride: `${SITE_ORIGIN}/i/${listing.displayCode || listing.code}`,
      }),
    );
  }

  // Visible HTML for visitors and crawlers before the interactive app starts.
  const pageCount = Math.max(1, Math.ceil(items.length / 12));
  // Direct-link routes are kept separate from discoverable SEO properties.
  fs.writeFileSync(path.join(distRoot, "data", "seo-routes.json"), JSON.stringify({ properties: items.map((item) => item.slug), unlistedProperties: COMBINED_CATALOGUE ? [] : allItems.filter((item) => item.visibility === "unlisted").map((item) => item.slug), cataloguePages: pageCount }));
  const cards = (listings) => listings.map((listing) => `<article class="property-card"><a class="property-photo" href="/property/${htmlEscape(listing.slug)}">${listing.photos[0] ? staticPhoto(listing.photos[0], listing.title, true) : ""}</a><div class="property-content"><h2><a href="/property/${htmlEscape(listing.slug)}">${htmlEscape(listing.title)}</a></h2><p>${htmlEscape(listing.location)}</p><strong>${htmlEscape(formatPrice(listing.price, listing.intent))}</strong><p>${htmlEscape(listing.propertyType)} · ${htmlEscape(listing.furnishing)}</p></div></article>`).join("");
  const pages = Array.from({ length: pageCount }, (_, index) => `<a href="/catalogue/page/${index + 1}/">Page ${index + 1}</a>`).join(" · ");
  const catalogueContent = (listings, heading) => `<main class="page-width home-stack"><header><a href="/">Properties</a> · <a href="/inquiries">Find a Property</a><h1>${heading}</h1><p>Properties for sale and rent in Klang Valley, listed by HS Ong, Real Estate Negotiator at The Roof Realty Sdn Bhd.</p></header><div class="property-grid">${cards(listings)}</div><nav aria-label="Catalogue pages">${pages}</nav></main>`;
  fs.writeFileSync(path.join(distRoot, "index.html"), indexHtml.replace('<div id="root"></div>', `<div id="root"><!--seo-content-start-->${catalogueContent(items.filter((item) => item.intent === "WTL" || item.alternateIntent === "WTL").slice(0, 12), "HS Ong Property Inventory — Klang Valley")}<!--seo-content-end--></div>`));
  for (let page = 1; page <= pageCount; page++) {
    const canonical = `${SITE_ORIGIN}/catalogue/page/${page}/`;
    let html = indexHtml.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, "");
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>Property Catalogue — Page ${page} | HS Ong</title>`);
    html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}">`);
    html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}">`);
    html = html.replace('<div id="root"></div>', `<div id="root">${renderCatalogueContent(items.slice((page - 1) * 12, page * 12), { heading: `Property Inventory Catalogue — Page ${page}`, page, pageCount, total: items.length })}</div>`);
    const directory = path.join(distRoot, "catalogue", "page", String(page));
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "index.html"), html);
  }
  const inquiryDirectory = path.join(distRoot, "inquiries");
  fs.mkdirSync(inquiryDirectory, { recursive: true });
  fs.writeFileSync(path.join(inquiryDirectory, "index.html"), indexHtml
    .replace(/<title>[\s\S]*?<\/title>/, "<title>Find a Property for Me | HS Ong</title>")
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE_ORIGIN}/inquiries">`)
    .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Tell HS Ong your budget, preferred location and requirements to find a property to rent or buy in Klang Valley.">')
    .replace('<div id="root"></div>', '<div id="root"><main class="page-width content-page"><h1>Find a Property for Me</h1><p>Share your rental or purchase requirements with HS Ong to find matching properties in Klang Valley.</p><a href="/">Browse current properties</a><noscript><p>Please enable JavaScript to complete the property requirement form.</p></noscript></main></div>'));

  return { count: allItems.length, inventoryVersion: meta.inventoryVersion, projectRoot };
}
