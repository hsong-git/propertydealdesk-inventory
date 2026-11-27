import { useSiteLanguage } from "../components/InquiryLanguage";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "../hooks";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { compareRecentlyUpdated } from "../utils/listing";
import { SITE_ORIGIN } from "../utils/seo";

export function CmiPage() {
  const { t: tSite } = useSiteLanguage();
  const { allItems, loading, error } = useInventory();
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("");
  const [visible, setVisible] = useState(12);
  const results = useMemo(() => allItems.filter((listing) => listing.visibility === "unlisted"
    && (!intent || listing.intent === intent || listing.alternateIntent === intent)
    && `${listing.displayCode || listing.code} ${listing.title} ${listing.location} ${listing.propertyType}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort(compareRecentlyUpdated), [allItems, search, intent]);
  return <main className="page-width home-stack">
    <Seo title="CMI Units | HS Ong Property Inventory" canonical={`${SITE_ORIGIN}/cmi`} robots="noindex, nofollow" />
    <Link className="back-link" to="/">{tSite("← Back to main catalogue")}</Link>
    <section className="catalogue-section">
      <div className="section-heading"><div><span className="eyebrow">{tSite("Separate inventory")}</span><h1>{tSite("CMI Units")}</h1><p>{tSite("Approved CMI units, kept separate from the main property catalogue. Contact HS Ong to confirm availability.")}</p></div><div className="catalogue-count"><strong>{tSite(results.length)}</strong><span>{tSite("units")}</span></div></div>
      <div className="cmi-search-controls">
        <input type="search" aria-label={tSite("Search CMI units")} placeholder={tSite("Search code, property or location")} value={search} onChange={(event) => { setSearch(event.target.value); setVisible(12); }} />
        <select aria-label={tSite("CMI listing intent")} value={intent} onChange={(event) => { setIntent(event.target.value); setVisible(12); }}><option value="">{tSite("Sale & rent")}</option><option value="WTS">{tSite("For sale")}</option><option value="WTL">{tSite("For rent")}</option></select>
      </div>
      {tSite(loading ? <div className="state-card">{tSite("Loading CMI units…")}</div> : error ? <div className="state-card error">{tSite(error)}</div> : results.length ? <div className="property-grid">{tSite(results.slice(0, visible).map((listing) => <PropertyCard key={listing.publicId} listing={listing} displayIntent={intent} />))}</div> : <div className="state-card">{tSite(search || intent ? "No CMI units match these filters." : "No approved CMI units have been published yet.")}</div>)}
      {tSite(visible < results.length ? <div className="load-more"><button type="button" className="button secondary" onClick={() => setVisible((count) => count + 12)}>{tSite("Load more units")}</button></div> : null)}
    </section>
  </main>;
}
