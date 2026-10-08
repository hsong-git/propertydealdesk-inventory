import { CATALOGUE_ORIGIN } from "../config/catalogueSite.js";
export const SITE_ORIGIN = CATALOGUE_ORIGIN;

export const defaultSeo = {
  title: "HS Ong Property Inventory | Klang & Shah Alam Listings",
  description:
    "Browse HS Ong's current public property inventory for Klang, Shah Alam, Bukit Tinggi, Bandar Botanic and nearby areas. WTS and WTL listings for co-broke and direct enquiries.",
  canonical: `${SITE_ORIGIN}/`,
  ogTitle: "HS Ong Property Inventory",
  ogDescription:
    "Current public property listings by Ong Hua Seong (HS Ong), Real Estate Negotiator.",
  image: `${SITE_ORIGIN}/og/property-inventory-card-white.png`,
  imageWidth: "1200",
  imageHeight: "630",
  imageType: "image/png",
};

const upsertMeta = (selector, createAttributes, value) => {
  if (!value) {
    document.head.querySelector(selector)?.remove();
    return;
  }
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
  imageWidth,
  imageHeight,
  imageType,
  type = "website",
  robots = "index, follow",
} = {}) {
  const absoluteImage = absoluteUrl(image);
  const isDefaultImage = absoluteImage === defaultSeo.image;
  const resolvedImageType = imageType || (absoluteImage.toLowerCase().endsWith(".webp") ? "image/webp" : defaultSeo.imageType);
  document.title = title;
  upsertMeta('meta[name="robots"]', { name: "robots" }, robots);
  upsertMeta('meta[name="description"]', { name: "description" }, description);
  upsertLink("canonical", canonical);
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, ogTitle);
  upsertMeta('meta[property="og:description"]', { property: "og:description" }, ogDescription);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
  upsertMeta('meta[property="og:type"]', { property: "og:type" }, type);
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, absoluteImage);
  upsertMeta('meta[property="og:image:width"]', { property: "og:image:width" }, imageWidth || (isDefaultImage ? defaultSeo.imageWidth : ""));
  upsertMeta('meta[property="og:image:height"]', { property: "og:image:height" }, imageHeight || (isDefaultImage ? defaultSeo.imageHeight : ""));
  upsertMeta('meta[property="og:image:type"]', { property: "og:image:type" }, resolvedImageType);
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "HS Ong Property Inventory");
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, ogTitle);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, ogDescription);
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, absoluteImage);
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

export const propertyJsonLd = (listing) => ({
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "@id": `${SITE_ORIGIN}/property/${listing.slug}#listing`,
  url: `${SITE_ORIGIN}/property/${listing.slug}`,
  name: listing.title,
  description: listing.description,
  image: listing.photos.map(absoluteUrl),
  offers: [
    { intent: listing.intent, price: listing.price },
    ...(listing.alternateIntent && listing.alternatePrice != null ? [{ intent: listing.alternateIntent, price: listing.alternatePrice }] : []),
  ].filter((offer) => offer.price > 0).map((offer) => ({
    "@type": "Offer", price: offer.price, priceCurrency: "MYR",
    businessFunction: offer.intent === "WTL" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell",
    url: `${SITE_ORIGIN}/property/${listing.slug}?intent=${offer.intent}`,
  })),
});

export const propertyBreadcrumbs = (listing) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Properties", item: `${SITE_ORIGIN}/` },
    { "@type": "ListItem", position: 2, name: listing.title, item: `${SITE_ORIGIN}/property/${listing.slug}` },
  ],
});
