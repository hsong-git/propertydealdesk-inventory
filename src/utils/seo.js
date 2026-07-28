export const SITE_ORIGIN = "https://property.myeviv.com";

export const defaultSeo = {
  title: "HS Ong Property Inventory | Klang & Shah Alam Listings",
  description:
    "Browse HS Ong's current public property inventory for Klang, Shah Alam, Bukit Tinggi, Bandar Botanic and nearby areas. WTS and WTL listings for co-broke and direct enquiries.",
  canonical: `${SITE_ORIGIN}/`,
  ogTitle: "HS Ong Property Inventory",
  ogDescription:
    "Current public property listings by Ong Hua Seong (HS Ong), Real Estate Negotiator REN 81340.",
  image: `${SITE_ORIGIN}/og/property-inventory-og.png`,
};

const upsertMeta = (selector, createAttributes, value) => {
  if (!value) return;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(createAttributes).forEach(([key, attributeValue]) => {
      element.setAttribute(key, attributeValue);
    });
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

export const absoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return defaultSeo.image;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

export function applySeo({
  title = defaultSeo.title,
  description = defaultSeo.description,
  canonical = defaultSeo.canonical,
  ogTitle = title,
  ogDescription = description,
  image = defaultSeo.image,
  type = "website",
} = {}) {
  document.title = title;
  upsertMeta('meta[name="description"]', { name: "description" }, description);
  upsertLink("canonical", canonical);
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, ogTitle);
  upsertMeta('meta[property="og:description"]', { property: "og:description" }, ogDescription);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
  upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, absoluteUrl(image));
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "HS Ong Property Inventory");
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, ogTitle);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, ogDescription);
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, absoluteUrl(image));
}

export function applyJsonLd(id, payload) {
  if (!payload) return;
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.id = id;
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
}

export const agentJsonLd = (profile) => ({
  "@context": "https://schema.org",
  "@type": ["Person", "RealEstateAgent"],
  name: profile.profilePanelName || profile.name,
  alternateName: profile.displayName,
  jobTitle: profile.title,
  identifier: profile.renNumber,
  worksFor: {
    "@type": "Organization",
    name: profile.agency,
  },
  url: SITE_ORIGIN,
  image: absoluteUrl(profile.portrait),
  email: profile.email,
  telephone: profile.phoneDisplay,
  areaServed: profile.serviceAreas.map((area) => ({
    "@type": "Place",
    name: area,
  })),
});

export const propertySeoDescription = (listing, priceText) => [
  listing.propertyType,
  listing.location && `in ${listing.location}`,
  priceText && `for ${priceText}`,
  listing.availability && `- ${listing.availability}`,
].filter(Boolean).join(" ");
