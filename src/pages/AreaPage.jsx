import { useSiteLanguage } from "../components/InquiryLanguage";
import { useParams } from "react-router-dom";
import { useInventory } from "../hooks";
import { Seo } from "../components/Seo";
import { PropertyCard } from "../components/PropertyCard";
import { AreaLinks } from "../components/AreaLinks";
import { NotFoundPage } from "./NotFoundPage";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";
import { SITE_ORIGIN } from "../utils/seo.js";
import { DISCOVERY_AREAS, areaPath, getAreaListings, areaSnapshot, areaDescription, areaStructuredData } from "../utils/areaDiscovery.js";
import { formatPrice, formatDateTime } from "../utils/listing.js";

function OfferSummary({ summary, intent }) {
  const { t: tSite } = useSiteLanguage();
  return <section className="content-card"><h2>{tSite(intent === "WTL" ? "Rental shortlist" : "Purchase shortlist")}</h2><p><strong>{tSite(summary.count)}</strong>{tSite(" listed ")}{tSite(summary.count === 1 ? "option" : "options")}{tSite(".")}</p><p>{tSite(summary.priced ? `${formatPrice(summary.min, intent)}${summary.max !== summary.min ? ` to ${formatPrice(summary.max, intent)}` : ""}` : "Ask HS Ong for current pricing.")}</p>{tSite(summary.priced < summary.count ? <p>{tSite("Some asking prices are not supplied.")}</p> : null)}</section>;
}

export function AreaPage() {
  const { t: tSite } = useSiteLanguage();
  const { area: slug } = useParams();
  const { items, meta, locationDictionary, loading, error } = useInventory();
  const area = DISCOVERY_AREAS.find(item => item.slug === slug);
  if (!area) return <NotFoundPage />;
  const listings = getAreaListings(items, area, locationDictionary, { includeCmi: COMBINED_CATALOGUE });
  const snapshot = areaSnapshot(listings);
  return <main className="page-width home-stack area-page">
    <Seo title={`${area.heading} | HS Ong`} description={areaDescription(area, listings.length)} canonical={SITE_ORIGIN + areaPath(area)} robots={!loading && (!listings.length || error) ? "noindex, follow" : "index, follow"} structuredData={!loading && listings.length ? areaStructuredData(area, listings, SITE_ORIGIN) : null} />
    <a className="back-link" href="/">{tSite("← Back to catalogue")}</a>
    <header className="section-heading"><div><span className="eyebrow">{tSite("Explore an area")}</span><h1>{tSite(area.heading)}</h1><p>{tSite(area.intro)}</p></div><div className="catalogue-count"><strong>{tSite(listings.length)}</strong><span>{tSite("listed properties")}</span></div></header>
    {tSite(loading ? <p role="status">{tSite("Loading current properties…")}</p> : error ? <p role="alert">{tSite("Unable to load current listings. Please refresh or contact HS Ong.")}</p> : <>
      <div className="area-summary"><OfferSummary summary={snapshot.rent} intent="WTL" /><OfferSummary summary={snapshot.sale} intent="WTS" /></div>
      <section><h2>{tSite("Current listings in ")}{tSite(area.name)}</h2>{tSite(listings.length ? <div className="property-grid">{tSite(listings.map(item => <PropertyCard key={item.publicId || item.code} listing={item} />))}</div> : <p>{tSite("No properties are currently published for this area.")}</p>)}</section>
      <section className="content-card"><h2>{tSite("How to compare these properties")}</h2><p>{tSite(area.guidance)}</p>{tSite(snapshot.types.length ? <p>{tSite("Property types currently listed: ")}{tSite(snapshot.types.join(", "))}{tSite(".")}</p> : null)}<p>{tSite("These are asking prices from this catalogue, not market valuations or completed transactions. A property offered for both rent and sale appears in both shortlists.")}</p>{tSite(meta ? <p>{tSite("Inventory published: ")}{tSite(formatDateTime(meta.publishedAt || meta.generatedAt))}{tSite(". Confirm the exact address, price and availability before making a decision.")}</p> : null)}</section>
    </>)}
    <section className="content-card"><h2>{tSite("Need help narrowing the search?")}</h2><p>{tSite("Tell HS Ong your budget, preferred property type and timeframe, or ask about an individual listing using its listing code.")}</p><div className="area-page-actions"><a className="button primary" href="/inquiries">{tSite("Find a property for me")}</a><a className="button secondary" href="/contact">{tSite("Contact HS Ong")}</a></div></section>
    <AreaLinks items={items} dictionary={locationDictionary} />
  </main>;
}
