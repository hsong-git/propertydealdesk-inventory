import { useSiteLanguage } from "./InquiryLanguage";
import { publishedAreas, areaPath } from "../utils/areaDiscovery.js";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";

export function AreaLinks({ items, dictionary, listing, allLocations = false, counts, searchParams }) {
  const { t: tSite } = useSiteLanguage();
  if (allLocations) {
    const locations = [...(counts || new Map())].filter(([,count]) => count > 0).sort(([a],[b]) => a.localeCompare(b, "en", {sensitivity:"base", numeric:true}));
    if (!locations.length) return null;
    return <nav className="area-discovery-links all-location-links" aria-label={tSite("Browse properties by area")}>
      <span>{tSite("Browse by location")}</span><div className="area-discovery-pills">{locations.map(([name,count]) => {
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
