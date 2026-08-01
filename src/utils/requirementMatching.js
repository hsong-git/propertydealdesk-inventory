import { compareRecentlyUpdated } from "./listing.js";
import { canonicalLocationsForListing } from "./locationFilter.js";

const normalizeType = (value) => {
  const text = String(value || "").toLowerCase();
  if (/condo|apartment|serviced/.test(text)) return "highrise";
  if (/terrace|link|superlink/.test(text)) return "terrace";
  if (/semi/.test(text)) return "semi-detached";
  if (/bungalow|detached/.test(text)) return "detached";
  if (/shop|office|retail|commercial/.test(text)) return "commercial";
  if (/factory|warehouse|industrial/.test(text)) return "industrial";
  return text.replace(/[^a-z0-9]+/g, " ").trim();
};

const locationScore = (area, listing, dictionary) => {
  const desired = String(area || "").toLowerCase().split(/[,;/]/).map((item) => item.trim()).filter(Boolean);
  const candidate = [listing.location, ...canonicalLocationsForListing(listing, dictionary)].map((item) => String(item).toLowerCase());
  return desired.some((term) => candidate.some((place) => place.includes(term) || term.includes(place))) ? 10_000 : 0;
};

const matchesRequestedLocation = (area, listing, dictionary) => {
  if (!String(area || "").trim()) return true;
  const desired = String(area).toLowerCase().trim();
  const canonical = canonicalLocationsForListing(listing, dictionary).map((item) => String(item).toLowerCase());
  const raw = String(listing.location || "").toLowerCase();
  return canonical.includes(desired) || raw.includes(desired);
};

const matchesRequestedType = (propertyType, listing) => {
  if (!String(propertyType || "").trim()) return true;
  return normalizeType(propertyType) === normalizeType(listing.propertyType);
};

export function requirementMatchScore(submission, listing, dictionary) {
  const requirements = submission?.requirements || {};
  const expectedIntent = submission?.intent === "rent" ? "WTL" : "WTS";
  if (!listing || listing.intent !== expectedIntent) return -1;
  let score = 1_000_000;
  score += locationScore(requirements.area, listing, dictionary);
  if (normalizeType(requirements.propertyType) === normalizeType(listing.propertyType)) score += 1_000;
  const budget = Number(requirements.budget);
  const price = Number(listing.price);
  if (budget > 0 && price > 0) {
    if (price <= budget) score += 500 + Math.max(0, 100 - ((budget - price) / budget) * 100);
    else score -= Math.min(400, ((price - budget) / budget) * 400);
  }
  if (listing.bedrooms != null && Number(listing.bedrooms) >= Number(requirements.bedrooms)) score += 80;
  if (listing.bathrooms != null && Number(listing.bathrooms) >= Number(requirements.bathrooms)) score += 40;
  if (submission.intent === "rent" && requirements.furnishing && requirements.furnishing !== "No Preference"
    && String(listing.furnishing).toLowerCase().includes(String(requirements.furnishing).toLowerCase())) score += 60;
  return Number(score.toFixed(4));
}

export function matchRequirements(submission, listings, dictionary, limit = 6) {
  if (!submission || !Array.isArray(listings)) return [];
  return listings
    .map((listing) => ({ listing, score: requirementMatchScore(submission, listing, dictionary) }))
    .filter(({ listing, score }) => score >= 0
      && matchesRequestedLocation(submission.requirements?.area, listing, dictionary)
      && matchesRequestedType(submission.requirements?.propertyType, listing))
    .sort((a, b) => b.score - a.score || compareRecentlyUpdated(a.listing, b.listing) || String(a.listing.code).localeCompare(String(b.listing.code)))
    .slice(0, Math.min(6, Math.max(0, limit)))
    .map(({ listing }) => listing);
}
