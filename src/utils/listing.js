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

export const recentActivityTime = (listing) => Math.max(
  Date.parse(listing.updatedAt) || 0,
  Date.parse(listing.createdAt) || 0,
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

export const postingText = (listing, profile) => {
  if (listing.postingCopy) return listing.postingCopy;

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
  return [
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
  ].join("\n");
};

export async function shareListing(listing) {
  const url = `${window.location.origin}/property/${listing.slug}`;
  const data = { title: `${listing.code} · ${listing.title}`, text: `${listing.title} at ${listing.location}`, url };
  if (navigator.share) return navigator.share(data);
  await navigator.clipboard.writeText(url);
  return "copied";
}
