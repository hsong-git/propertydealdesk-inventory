import { compareRecentlyUpdated } from "./listing.js";

const STOP_WORDS = new Set(["at", "and", "the", "of", "in", "to", "for", "near"]);

const tokenize = (value) => String(value || "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .map((token) => token.trim())
  .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const locationScore = (current, candidate) => {
  const currentTokens = new Set(tokenize(current.location));
  const candidateTokens = new Set(tokenize(candidate.location));
  if (!currentTokens.size || !candidateTokens.size) return 0;
  const matches = [...currentTokens].filter((token) => candidateTokens.has(token)).length;
  if (!matches) return 0;
  return Math.min(30, 12 + matches * 6);
};

const priceScore = (current, candidate) => {
  const currentPrice = Number(current.price);
  const candidatePrice = Number(candidate.price);
  if (!Number.isFinite(currentPrice) || !Number.isFinite(candidatePrice) || currentPrice <= 0 || candidatePrice <= 0) return 0;
  const differenceRatio = Math.abs(currentPrice - candidatePrice) / Math.max(currentPrice, candidatePrice);
  return Math.max(0, 20 - differenceRatio * 40);
};

export function relatedListingScore(current, candidate) {
  if (!current || !candidate) return 0;
  let score = 0;
  if (current.intent === candidate.intent) score += 40;
  score += locationScore(current, candidate);
  if (String(current.propertyType || "").toLowerCase() === String(candidate.propertyType || "").toLowerCase()) score += 18;
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
