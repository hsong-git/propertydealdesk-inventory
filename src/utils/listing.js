export const formatPrice = (value, intent) => {
  if (!value) return intent === "WTB" || intent === "WTR" ? "Budget on request" : "Price on request";
  const suffix = intent === "WTL" || intent === "WTR" ? " / month" : "";
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

export const intentLabels = {
  WTS: "Want to Sell",
  WTL: "Want to Let",
  WTB: "Want to Buy",
  WTR: "Want to Rent",
};

export const enquiryText = (listing, displayName) => {
  const action = listing.intent === "WTL" || listing.intent === "WTR" ? "renting" : "this property";
  return `Hi ${displayName}, I am interested in listing ${listing.code}, ${listing.title} at ${listing.location}. Could you share the latest availability and details for ${action}?`;
};

export const whatsappUrl = (number, message) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

export async function shareListing(listing) {
  const url = `${window.location.origin}/property/${listing.slug}`;
  const data = { title: `${listing.code} · ${listing.title}`, text: `${listing.title} at ${listing.location}`, url };
  if (navigator.share) return navigator.share(data);
  await navigator.clipboard.writeText(url);
  return "copied";
}
