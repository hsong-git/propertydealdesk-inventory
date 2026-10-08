import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "../hooks";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { compareRecentlyUpdated } from "../utils/listing";
import { SITE_ORIGIN } from "../utils/seo";

export function CmiPage() {
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
    <Link className="back-link" to="/">← Back to main catalogue</Link>
    <section className="catalogue-section">
      <div className="section-heading"><div><span className="eyebrow">Separate inventory</span><h1>CMI Units</h1><p>Approved CMI units, kept separate from the main property catalogue. Contact HS Ong to confirm availability.</p></div><div className="catalogue-count"><strong>{results.length}</strong><span>units</span></div></div>
      <div className="cmi-search-controls">
        <input type="search" aria-label="Search CMI units" placeholder="Search code, property or location" value={search} onChange={(event) => { setSearch(event.target.value); setVisible(12); }} />
        <select aria-label="CMI listing intent" value={intent} onChange={(event) => { setIntent(event.target.value); setVisible(12); }}><option value="">Sale &amp; rent</option><option value="WTS">For sale</option><option value="WTL">For rent</option></select>
      </div>
      {loading ? <div className="state-card">Loading CMI units…</div> : error ? <div className="state-card error">{error}</div> : results.length ? <div className="property-grid">{results.slice(0, visible).map((listing) => <PropertyCard key={listing.publicId} listing={listing} displayIntent={intent} />)}</div> : <div className="state-card">{search || intent ? "No CMI units match these filters." : "No approved CMI units have been published yet."}</div>}
      {visible < results.length ? <div className="load-more"><button type="button" className="button secondary" onClick={() => setVisible((count) => count + 12)}>Load more units</button></div> : null}
    </section>
  </main>;
}
