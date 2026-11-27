import { useSiteLanguage } from "./InquiryLanguage";
import { publishedAreas, areaPath } from "../utils/areaDiscovery.js";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";
import { topLocationsByCount } from "../utils/locationFilter.js";

export function AreaLinks({ items, dictionary, listing, allLocations = false, counts, searchParams }) {
  const { t: tSite } = useSiteLanguage();
  if (allLocations) {
    const locations = topLocationsByCount(counts);
    if (!locations.length) return null;
    return <nav className="area-discovery-links all-location-links" aria-label={tSite("Browse properties by area")}>
      <span>{tSite("Top 10 Popular Location")}</span><div className="area-discovery-pills">{locations.map(([name,count]) => {
        const params = new URLSearchParams(searchParams);
        params.delete("location"); params.set("location", name);
        return <a key={name} href={`/?${params.toString()}#properties`}>{name} ({count})</a>;
      })}</div>
    </nav>;
  }
  const areas = publishedAreas(listing ? [listing] : items, dictionary, { includeCmi: COMBINED_CATALOGUE });
  if (!areas.length) return null;
  return <nav className="area-discovery-links" aria-label={tSite(listing ? "Explore this area" : "Browse properties by area")}>
    <span>{tSite(listing ? "More properties in:" : "Browse by popular area")}</span>
    <div className="area-discovery-pills">{tSite(areas.map(area => <a key={area.slug} href={areaPath(area)}>{tSite(area.name)}{tSite(listing ? "" : ` (${area.listings.length})`)}</a>))}</div>
  </nav>;
}
