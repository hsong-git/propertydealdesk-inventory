import { compareRecentlyUpdated } from "./listing.js";
import { canonicalLocationsForListing } from "./locationFilter.js";

const BROAD_LOCATION_LABELS = new Set(["Klang", "Shah Alam"]);

const locationScore = (current, candidate) => {
  const currentLocations = canonicalLocationsForListing(current);
  const candidateLocations = new Set(canonicalLocationsForListing(candidate));
  if (!currentLocations.length || !candidateLocations.size) return 0;
  const matches = currentLocations.filter((location) => candidateLocations.has(location));
  if (!matches.length) return 0;
  const specificMatches = matches.filter((location) => !BROAD_LOCATION_LABELS.has(location)).length;
  const broadMatches = matches.length - specificMatches;
  return Math.min(15_000, specificMatches * 10_000 + broadMatches * 1_500);
};

const priceScore = (current, candidate) => {
  const currentPrice = Number(current.price);
  const candidatePrice = Number(candidate.price);
  if (!Number.isFinite(currentPrice) || !Number.isFinite(candidatePrice) || currentPrice <= 0 || candidatePrice <= 0) return 0;
  const differenceRatio = Math.abs(currentPrice - candidatePrice) / Math.max(currentPrice, candidatePrice);
  return Math.max(0, 90 - differenceRatio * 180);
};

const normalizePropertyType = (propertyType) => {
  const value = String(propertyType || "").toLowerCase();
  if (/condo|condominium|apartment|serviced/.test(value)) return "highrise";
  if (/terrace|link|superlink/.test(value)) return "terrace";
  if (/semi/.test(value)) return "semi-detached";
  if (/bungalow|detached/.test(value)) return "detached";
  if (/shop|office|retail|commercial/.test(value)) return "commercial";
  if (/factory|warehouse|industrial/.test(value)) return "industrial";
  return value.replace(/[^a-z0-9]+/g, " ").trim();
};

const propertyTypeScore = (current, candidate) => {
  const currentType = normalizePropertyType(current.propertyType);
  const candidateType = normalizePropertyType(candidate.propertyType);
  if (!currentType || !candidateType) return 0;
  return currentType === candidateType ? 1_000 : 0;
};

export function relatedListingScore(current, candidate) {
  if (!current || !candidate) return 0;
  let score = 0;
  if (current.intent === candidate.intent) score += 1_000_000;
  score += locationScore(current, candidate);
  score += propertyTypeScore(current, candidate);
  score += priceScore(current, candidate);
  return Number(score.toFixed(4));
}

export function getRelatedListings(current, listings, limit = 8) {
  if (!current || !Array.isArray(listings)) return [];
  return listings
    .filter((candidate) => candidate && candidate.slug !== current.slug && candidate.code !== current.code && candidate.publicId !== current.publicId)
    .map((candidate) => ({ listing: candidate, score: relatedListingScore(current, candidate) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      const scoreOrder = b.score - a.score;
      if (scoreOrder) return scoreOrder;
      const recentOrder = compareRecentlyUpdated(a.listing, b.listing);
      if (recentOrder) return recentOrder;
      return String(a.listing.code || "").localeCompare(String(b.listing.code || ""));
    })
    .slice(0, limit)
    .map((item) => item.listing);
}
