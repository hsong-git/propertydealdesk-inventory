import { matchesLocationFilter } from "./locationFilter.js";

// A small, curated set of useful destinations, not pages for every filter.
export const DISCOVERY_AREAS = [
  { slug: "bukit-tinggi", name: "Bukit Tinggi", heading: "Properties in Bukit Tinggi, Klang", intro: "Compare the Bukit Tinggi properties currently listed with HS Ong. Review each unit’s location, property type, furnishing and asking price before choosing a viewing.", guidance: "For a rental shortlist, compare furnishing, parking and the monthly rent together. For a purchase, check the individual unit’s tenure, built-up area and condition where supplied. The exact location is shown on each listing." },
  { slug: "bandar-botanic", name: "Bandar Botanic", heading: "Properties in Bandar Botanic, Klang", intro: "Explore current Bandar Botanic listings for rent and sale. Open each property to compare its photos, layout and unit details rather than relying on the headline price alone.", guidance: "For a landed property, compare the number of storeys, land size, built-up area and lot position where stated. For other property types, review the supplied unit details and ask HS Ong about anything not recorded." },
  { slug: "setia-alam", name: "Setia Alam", heading: "Properties in Setia Alam", intro: "Browse properties listed under Setia Alam in the current catalogue. Use the development and location shown on each unit to narrow your search, then compare available layouts and prices.", guidance: "For an apartment shortlist, compare bedrooms, floor area, furnishing and parking where provided. Check the exact development before arranging a viewing, and share your preferred move-in date or purchase requirements with HS Ong." },
];

export const areaPath = (area) => `/areas/${area.slug}`;

export function getAreaListings(items, area, dictionary, { includeCmi = false } = {}) {
  if (!area) return [];
  return (items || []).filter(item => (includeCmi || item.visibility !== "unlisted") && matchesLocationFilter(item, area.name, dictionary));
}

export function publishedAreas(items, dictionary, options) {
  return DISCOVERY_AREAS.map(area => ({ ...area, listings: getAreaListings(items, area, dictionary, options) })).filter(area => area.listings.length);
}

export function areaSnapshot(items) {
  const summarize = (intent) => {
    const offers = items.filter(item => item.intent === intent || item.alternateIntent === intent);
    const prices = offers.map(item => Number(item.intent === intent ? item.price : item.alternatePrice)).filter(price => Number.isFinite(price) && price > 0);
    return { count: offers.length, priced: prices.length, min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null };
  };
  return { total: items.length, rent: summarize("WTL"), sale: summarize("WTS"), types: [...new Set(items.map(item => item.propertyType).filter(Boolean))].sort() };
}

export function areaDescription(area, count) {
  return `Explore ${count} current ${area.name} ${count === 1 ? "property" : "properties"} for rent or sale with HS Ong. Compare asking prices, photos and unit details, then enquire directly.`;
}

export function areaStructuredData(area, items, origin) {
  const url = origin + areaPath(area);
  return [
    { "@context": "https://schema.org", "@type": "CollectionPage", "@id": url, url, name: area.heading, description: areaDescription(area, items.length), mainEntity: { "@type": "ItemList", numberOfItems: items.length, itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: `${origin}/property/${item.slug}` })) } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Properties", item: origin + "/" }, { "@type": "ListItem", position: 2, name: area.name, item: url }] },
  ];
}
