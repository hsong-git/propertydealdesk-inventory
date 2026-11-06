import { matchesInventoryFilter } from "./listing.js";
import { matchesKeywordSearch, matchesLocationFilter } from "./locationFilter.js";
import { matchesSelection, selectedValues } from "./multiSelect.js";

export const offerForIntent = (listing, intent) => (
  listing.intent === intent
    ? { intent: listing.intent, price: listing.price }
    : listing.alternateIntent === intent
      ? { intent: listing.alternateIntent, price: listing.alternatePrice }
      : null
);

export function matchesCatalogueFilters(item, filters, mode, dictionary, { ignoreLocation = false } = {}) {
  const offer = filters.intent ? offerForIntent(item, filters.intent) : { price: item.price };
  const locations = selectedValues(filters.location);
  return (mode !== "featured" || item.featured)
    && matchesInventoryFilter(item, filters.classification)
    && matchesKeywordSearch(item, filters.keyword)
    && Boolean(offer)
    && matchesSelection(item.propertyType, filters.propertyType)
    && (ignoreLocation || !locations.length || locations.some(location => matchesLocationFilter(item, location, dictionary)))
    && (!filters.minPrice || offer.price >= Number(filters.minPrice))
    && (!filters.maxPrice || offer.price <= Number(filters.maxPrice))
    && (!filters.bedrooms || Number(item.bedrooms || 0) >= Number(filters.bedrooms))
    && matchesSelection(item.furnishing, filters.furnishing);
}
