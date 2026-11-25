import { publishedAreas, areaPath } from "../utils/areaDiscovery.js";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";

export function AreaLinks({ items, dictionary, listing }) {
  const areas = publishedAreas(listing ? [listing] : items, dictionary, { includeCmi: COMBINED_CATALOGUE });
  if (!areas.length) return null;
  return <nav className="area-discovery-links" aria-label={listing ? "Explore this area" : "Browse properties by area"}>
    <span>{listing ? "More properties in:" : "Browse by popular area"}</span>
    <div className="area-discovery-pills">{areas.map(area => <a key={area.slug} href={areaPath(area)}>{area.name}{listing ? "" : ` (${area.listings.length})`}</a>)}</div>
  </nav>;
}
