import fs from "node:fs";
import path from "node:path";
import { agentProfile } from "../src/config/agentProfile.js";
import { COMBINED_CATALOGUE } from "../src/config/catalogueSite.js";
import { publishedAreas, areaPath, areaSnapshot, areaDescription, areaStructuredData } from "../src/utils/areaDiscovery.js";
import { formatPrice, formatDateTime } from "../src/utils/listing.js";
import { SITE_ORIGIN } from "../src/utils/seo.js";
import { renderCatalogueContent, renderCatalogueCards } from "./catalogue-html.mjs";

const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function discoveryLinks(items, dictionary, listing) {
  const areas = publishedAreas(listing ? [listing] : items, dictionary, { includeCmi: COMBINED_CATALOGUE });
  return areas.length ? `<nav class="area-discovery-links" aria-label="Browse properties by area"><span>${listing ? "More properties in:" : "Browse by area:"}</span>${areas.map(area => `<a href="${areaPath(area)}">${escape(area.name)}${listing ? "" : ` (${area.listings.length})`}</a>`).join("")}</nav>` : "";
}

const shell = content => renderCatalogueContent([], { heading: "Properties" }).replace(/<main[\s\S]*?<\/main>/, content).replace('<div class="footer-links">', '<div class="footer-links"><a href="/about">About HS Ong</a><a href="/contact">Contact</a>');

function publicHtml(indexHtml, { title, description, route, content, structuredData }) {
  let html = indexHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(description)}">`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE_ORIGIN}${route}">`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${SITE_ORIGIN}${route}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escape(title)}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escape(description)}">`)
    .replace('<div id="root"></div>', `<div id="root">${shell(content)}</div>`);
  if (structuredData) html = html.replace("</head>", `<script id="page-jsonld" type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script></head>`);
  return html;
}

function offerSummary(summary, intent) {
  const name = intent === "WTL" ? "Rental shortlist" : "Purchase shortlist";
  const prices = summary.priced ? `${formatPrice(summary.min, intent)}${summary.max !== summary.min ? ` to ${formatPrice(summary.max, intent)}` : ""}` : "No asking prices are supplied for these options.";
  return `<section class="content-card"><h2>${name}</h2><p><strong>${summary.count}</strong> listed options.</p><p>${escape(prices)}</p>${summary.priced < summary.count ? "<p>Some asking prices are not supplied.</p>" : ""}</section>`;
}

export function writeDiscoveryPages({ indexHtml, distRoot, items, dictionary, meta }) {
  const areas = publishedAreas(items, dictionary, { includeCmi: COMBINED_CATALOGUE });
  fs.mkdirSync(path.join(distRoot, "areas"), { recursive: true });
  for (const area of areas) {
    const snapshot = areaSnapshot(area.listings);
    const content = `<main class="page-width home-stack area-page"><a class="back-link" href="/">← Back to catalogue</a><header class="section-heading"><div><span class="eyebrow">Explore an area</span><h1>${escape(area.heading)}</h1><p>${escape(area.intro)}</p></div><div class="catalogue-count"><strong>${snapshot.total}</strong><span>listed properties</span></div></header><div class="area-summary">${offerSummary(snapshot.rent, "WTL")}${offerSummary(snapshot.sale, "WTS")}</div><section><h2>Current listings in ${escape(area.name)}</h2><div class="property-grid">${renderCatalogueCards(area.listings)}</div></section><section class="content-card"><h2>How to compare these properties</h2><p>${escape(area.guidance)}</p><p>Property types currently listed: ${escape(snapshot.types.join(", "))}.</p><p>These are asking prices from this catalogue, not market valuations or completed transactions. A property offered for both rent and sale appears in both shortlists.</p><p>Inventory published: ${escape(formatDateTime(meta.publishedAt || meta.generatedAt))}. Confirm the exact address, price and availability before making a decision.</p></section><section class="content-card"><h2>Need help narrowing the search?</h2><p>Tell HS Ong your budget, preferred property type and timeframe, or ask about an individual listing using its listing code.</p><div class="area-page-actions"><a class="button primary" href="/inquiries">Find a property for me</a><a class="button secondary" href="/contact">Contact HS Ong</a></div></section>${discoveryLinks(items, dictionary)}</main>`;
    fs.writeFileSync(path.join(distRoot, "areas", area.slug + ".html"), publicHtml(indexHtml, { title: area.heading + " | HS Ong", description: areaDescription(area, area.listings.length), route: areaPath(area), content, structuredData: areaStructuredData(area, area.listings, SITE_ORIGIN) }));
  }
  const contact = `<p>Telephone: <a href="tel:+${escape(agentProfile.phone)}">${escape(agentProfile.phoneDisplay)}</a></p><p>Email: <a href="mailto:${escape(agentProfile.email)}">${escape(agentProfile.email)}</a></p>`;
  const identity = `<p>${escape(agentProfile.profilePanelName)} · ${escape(agentProfile.renNumber)}</p><p>${escape(agentProfile.title)} · ${escape(agentProfile.agency)}</p>`;
  const about = `<main class="page-width content-page"><section class="content-card"><h1>About HS Ong</h1>${identity}<p>${escape(agentProfile.professionalIntroduction)}</p><h2>Property-related services</h2><ul>${agentProfile.services.map(service => `<li>${escape(service)}</li>`).join("")}</ul><p>${escape(agentProfile.coBrokeMessage)}</p>${contact}<a class="button secondary" href="/contact">Contact HS Ong</a></section><section class="content-card"><h2>General listing disclaimer</h2><p>Property information, pricing, availability, measurements and descriptions should be independently verified before any decision or commitment.</p></section></main>`;
  const contactContent = `<main class="page-width content-page"><section class="content-card"><h1>Contact HS Ong for property enquiries</h1>${identity}${contact}<p>Please include the listing code, whether you want to rent or buy, and your preferred viewing time.</p><p>Please confirm an appointment and meeting location directly with HS Ong.</p><a class="button primary" href="/inquiries">Find a property for me</a></section><section class="content-card"><h2>Areas served</h2><p>${escape(agentProfile.serviceAreas.join(", "))}.</p><a href="/about">About HS Ong</a></section></main>`;
  for (const [route, title, description, content] of [
    ["/about", "About HS Ong | Real Estate Negotiator", "Learn about Ong Hua Seong (HS Ong), REN 81340, serving property enquiries in Klang, Shah Alam and nearby areas.", about],
    ["/contact", "Contact HS Ong | Property Enquiries", "Contact HS Ong for property enquiries, viewing arrangements and co-broke discussions in Klang Valley.", contactContent],
  ]) fs.writeFileSync(path.join(distRoot, route.slice(1) + ".html"), publicHtml(indexHtml, { title, description, route, content }));
  return areas.map(area => area.slug);
}
