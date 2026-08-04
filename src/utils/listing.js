import { SITE_ORIGIN } from "./seo.js";

const AGENT_TOOLS_ORIGIN = "https://agenttools.myeviv.com";

export const formatPrice = (value, intent) => {
  if (!value) return "Price on request";
  const suffix = intent === "WTL" ? " / month" : "";
  return `RM ${Number(value).toLocaleString("en-MY")}${suffix}`;
};

export const formatDate = (value) => new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date(value));

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "timestamp unavailable";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
};

export const recentActivityTime = (listing) => (
  Date.parse(listing.listedAt)
  || Date.parse(listing.createdAt)
  || Date.parse(listing.updatedAt)
  || 0
);

export const compareRecentlyUpdated = (a, b) => {
  const updatedOrder = recentActivityTime(b) - recentActivityTime(a);
  if (updatedOrder) return updatedOrder;
  return String(a.code || "").localeCompare(String(b.code || ""));
};

export const intentLabels = {
  WTS: "Want to Sell",
  WTL: "Want to Let",
};

export const enquiryText = (listing, displayName) => {
  const action = listing.intent === "WTL" ? "renting" : "this property";
  return `Hi ${displayName}, I am interested in listing ${listing.code}, ${listing.title} at ${listing.location}. Could you share the latest availability and details for ${action}?`;
};

export const photoDownloadRequestText = (listing, displayName) => [
  `Hi ${displayName}, PM for photos.`,
  "",
  `Property code: ${listing.code}`,
  `Title: ${listing.title}`,
  `Location: ${listing.location}`,
  `Price: ${formatPrice(listing.price, listing.intent)}`,
].join("\n");

export const whatsappUrl = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

export const listingDetailUrl = (listing, origin = SITE_ORIGIN) => `${origin}/property/${listing.slug}`;

const supplyIntents = new Set(["WTS", "WTL"]);

export const listingShortUrl = (listing, origin = SITE_ORIGIN) => `${origin}/i/${String(listing.code || "").toUpperCase()}`;

export const postingFootnoteUrl = (listing) => {
  const intent = String(listing.intent || "").toUpperCase();
  return supplyIntents.has(intent) ? listingShortUrl(listing) : AGENT_TOOLS_ORIGIN;
};

export const postingShortLinkFootnote = (listing) => [
  "🤝 Co-broke welcome",
  "🏠 Listing details & photos:",
  postingFootnoteUrl(listing),
].join("\n");

export const withPostingShortLinkFootnote = (text, listing) => {
  const footnote = postingShortLinkFootnote(listing);
  const standardFootnotePattern = new RegExp(
    String.raw`(?:\r?\n){0,3}🤝\s*Co-broke welcome\s*(?:\r?\n)🏠\s*Listing details & photos:\s*(?:\r?\n)\s*https:\/\/(?:property|agenttools)\.myeviv\.com(?:\/i\/[A-Z0-9_-]+)?\/?`,
    "gi",
  );
  const cleaned = String(text || "").replace(standardFootnotePattern, "").trim();
  return [cleaned, footnote].filter(Boolean).join("\n\n");
};

export const postingText = (listing, profile) => {
  if (listing.postingCopy) return withPostingShortLinkFootnote(listing.postingCopy, listing);

  const facts = [
    listing.propertyType && `Property type: ${listing.propertyType}`,
    listing.unitType && `Unit type: ${listing.unitType}`,
    Number.isFinite(listing.bedrooms) && `Bedrooms: ${listing.bedrooms}`,
    Number.isFinite(listing.bathrooms) && `Bathrooms: ${listing.bathrooms}`,
    listing.builtUpSqFt && `Built-up: ${Number(listing.builtUpSqFt).toLocaleString("en-MY")} sq ft`,
    listing.landSize && `Land size: ${listing.landSize}`,
    listing.furnishing && `Furnishing: ${listing.furnishing}`,
    listing.facing && `Facing: ${listing.facing}`,
  ].filter(Boolean);
  const features = (listing.features || []).filter(Boolean);
  return withPostingShortLinkFootnote([
    `${listing.intent} | ${listing.code}`,
    listing.title,
    `Location: ${listing.location}`,
    `Price: ${formatPrice(listing.price, listing.intent)}`,
    "",
    ...facts,
    ...(listing.description ? ["", listing.description] : []),
    ...(features.length ? ["", "Features:", ...features.map((item) => `- ${item}`)] : []),
    "",
    `Contact ${profile.displayName} (${profile.renNumber})`,
    `WhatsApp: ${profile.phoneDisplay}`,
  ].join("\n"), listing);
};

export async function shareListing(listing) {
  const url = listingShortUrl(listing);
  const data = { title: `${listing.code} · ${listing.title}`, text: `${listing.title} at ${listing.location}`, url };
  if (navigator.share) return navigator.share(data);
  await navigator.clipboard.writeText(url);
  return "copied";
}
