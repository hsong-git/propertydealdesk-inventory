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
  return <section className="content-card"><h2>{intent === "WTL" ? "Rental shortlist" : "Purchase shortlist"}</h2><p><strong>{summary.count}</strong> listed {summary.count === 1 ? "option" : "options"}.</p><p>{summary.priced ? `${formatPrice(summary.min, intent)}${summary.max !== summary.min ? ` to ${formatPrice(summary.max, intent)}` : ""}` : "Ask HS Ong for current pricing."}</p>{summary.priced < summary.count ? <p>Some asking prices are not supplied.</p> : null}</section>;
}

export function AreaPage() {
  const { area: slug } = useParams();
  const { items, meta, locationDictionary, loading, error } = useInventory();
  const area = DISCOVERY_AREAS.find(item => item.slug === slug);
  if (!area) return <NotFoundPage />;
  const listings = getAreaListings(items, area, locationDictionary, { includeCmi: COMBINED_CATALOGUE });
  const snapshot = areaSnapshot(listings);
  return <main className="page-width home-stack area-page">
    <Seo title={`${area.heading} | HS Ong`} description={areaDescription(area, listings.length)} canonical={SITE_ORIGIN + areaPath(area)} robots={!loading && (!listings.length || error) ? "noindex, follow" : "index, follow"} structuredData={!loading && listings.length ? areaStructuredData(area, listings, SITE_ORIGIN) : null} />
    <a className="back-link" href="/">← Back to catalogue</a>
    <header className="section-heading"><div><span className="eyebrow">Explore an area</span><h1>{area.heading}</h1><p>{area.intro}</p></div><div className="catalogue-count"><strong>{listings.length}</strong><span>listed properties</span></div></header>
    {loading ? <p role="status">Loading current properties…</p> : error ? <p role="alert">Unable to load current listings. Please refresh or contact HS Ong.</p> : <>
      <div className="area-summary"><OfferSummary summary={snapshot.rent} intent="WTL" /><OfferSummary summary={snapshot.sale} intent="WTS" /></div>
      <section><h2>Current listings in {area.name}</h2>{listings.length ? <div className="property-grid">{listings.map(item => <PropertyCard key={item.publicId || item.code} listing={item} />)}</div> : <p>No properties are currently published for this area.</p>}</section>
      <section className="content-card"><h2>How to compare these properties</h2><p>{area.guidance}</p>{snapshot.types.length ? <p>Property types currently listed: {snapshot.types.join(", ")}.</p> : null}<p>These are asking prices from this catalogue, not market valuations or completed transactions. A property offered for both rent and sale appears in both shortlists.</p>{meta ? <p>Inventory published: {formatDateTime(meta.publishedAt || meta.generatedAt)}. Confirm the exact address, price and availability before making a decision.</p> : null}</section>
    </>}
    <section className="content-card"><h2>Need help narrowing the search?</h2><p>Tell HS Ong your budget, preferred property type and timeframe, or ask about an individual listing using its listing code.</p><div className="area-page-actions"><a className="button primary" href="/inquiries">Find a property for me</a><a className="button secondary" href="/contact">Contact HS Ong</a></div></section>
    <AreaLinks items={items} dictionary={locationDictionary} />
  </main>;
}
