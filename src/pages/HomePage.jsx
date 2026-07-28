import { AlertTriangle, ExternalLink, Handshake, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { CatalogueFilters } from "../components/CatalogueFilters";
import { ContactActions } from "../components/ContactActions";
import { ProfilePanel } from "../components/ProfilePanel";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { useInventory } from "../hooks";
import { compareRecentlyUpdated, formatDateTime } from "../utils/listing";

const defaults = { keyword: "", intent: "", propertyType: "", location: "", minPrice: "", maxPrice: "", bedrooms: "", furnishing: "", availability: "", sort: "recent" };

export function HomePage() {
  const { items, meta, loading, error } = useInventory();
  const [filters, setFilters] = useState(defaults);
  const [catalogueMode, setCatalogueMode] = useState("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(6);
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && value).length
    + (catalogueMode === "featured" ? 1 : 0);
  const options = useMemo(() => ({
    propertyTypes: [...new Set(items.map((item) => item.propertyType))].sort(),
    locations: [...new Set(items.map((item) => item.location))].sort(),
    furnishing: [...new Set(items.map((item) => item.furnishing))].sort(),
    availability: [...new Set(items.map((item) => item.availability))].sort(),
  }), [items]);
  const results = useMemo(() => {
    const term = filters.keyword.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const searchable = [item.code, item.title, item.propertyType, item.location, item.description, ...(item.features || [])].join(" ").toLowerCase();
      return (catalogueMode !== "featured" || item.featured)
        && (!term || searchable.includes(term))
        && (!filters.intent || item.intent === filters.intent)
        && (!filters.propertyType || item.propertyType === filters.propertyType)
        && (!filters.location || item.location === filters.location)
        && (!filters.minPrice || item.price >= Number(filters.minPrice))
        && (!filters.maxPrice || item.price <= Number(filters.maxPrice))
        && (!filters.bedrooms || Number(item.bedrooms || 0) >= Number(filters.bedrooms))
        && (!filters.furnishing || item.furnishing === filters.furnishing)
        && (!filters.availability || item.availability === filters.availability);
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (filters.sort === "price-asc") return a.price - b.price;
      if (filters.sort === "price-desc") return b.price - a.price;
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return compareRecentlyUpdated(a, b);
    });
  }, [items, filters, catalogueMode]);
  const reset = () => { setFilters(defaults); setCatalogueMode("all"); setVisible(6); };
  const updateCatalogueMode = (mode) => {
    setCatalogueMode(mode);
    setVisible(6);
  };

  return (
    <main>
      <Seo />
      <div className="page-width home-stack">
        <ProfilePanel />
        {meta?.isMockData ? (
          <section className="development-data-notice" role="status">
            <AlertTriangle size={20} />
            <div><strong>Development preview — mock inventory</strong><span>{meta.notice}</span></div>
          </section>
        ) : null}
        <section id="properties" className="catalogue-section">
          <div className="section-heading">
            <div><span className="eyebrow">Public property listings</span><h2>{agentProfile.catalogueHeading}</h2><p>Explore current opportunities and contact me directly to confirm details or arrange a viewing.</p></div>
            <div className="catalogue-count"><strong>{results.length}</strong><span>matching {results.length === 1 ? "property" : "properties"}</span>{meta ? <small>Inventory {meta.inventoryVersion} · {meta.isMockData ? "generated" : "published"} {formatDateTime(meta.publishedAt || meta.generatedAt)}</small> : null}</div>
          </div>
          <CatalogueFilters filters={filters} setFilters={setFilters} options={options} activeCount={activeCount} onReset={reset} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} catalogueMode={catalogueMode} setCatalogueMode={updateCatalogueMode} />
          {loading ? <div className="state-card"><LoaderCircle className="spin" /><strong>Loading public inventory…</strong></div> : null}
          {error ? <div className="state-card error"><strong>{error}</strong><span>Please refresh the page or contact HS Ong directly.</span></div> : null}
          {!loading && !error && results.length ? <div className="property-grid">{results.slice(0, visible).map((listing) => <PropertyCard key={listing.publicId} listing={listing} />)}</div> : null}
          {!loading && !error && !results.length ? <div className="state-card"><strong>{items.length ? "No properties match these filters." : "No published properties are currently available."}</strong><span>{items.length ? "Try clearing one or more filters to see other opportunities." : "Please check back after the next approved inventory publication."}</span>{items.length ? <button className="button secondary" type="button" onClick={reset}>Reset Filters</button> : null}</div> : null}
          {visible < results.length ? <div className="load-more"><button className="button secondary" type="button" onClick={() => setVisible((count) => count + 6)}>Load more properties</button></div> : null}
        </section>
        <section className="co-broke-panel">
          <span className="co-broke-icon"><Handshake size={27} /></span>
          <div><span className="eyebrow">Working together</span><h2>Co-broke agents are welcome</h2><p>{agentProfile.coBrokeMessage}</p></div>
          <ContactActions
            includeCall={false}
            includeWhatsApp
            whatsappLabel="Contact HS Ong"
            message={`Hi ${agentProfile.displayName}, I am a real estate agent and would like to ask about current co-broke opportunities, available listings and viewing arrangements.`}
          />
        </section>
        <section className="agent-tools-panel" aria-labelledby="agent-tools-heading">
          <div className="agent-tools-copy">
            <span className="eyebrow">For active co-broke agents</span>
            <h2 id="agent-tools-heading">PropertyDealDesk Match Edition</h2>
            <p>A private agent-facing workflow to help review possible matches faster, stay organised around active requests, and receive phone alerts when follow-up matters.</p>
            <ul className="agent-tools-points">
              <li>Review matching opportunities faster</li>
              <li>Keep co-broke follow-up focused</li>
              <li>Use alongside the public inventory catalogue</li>
            </ul>
            <a className="button primary" href="https://agenttools.myeviv.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} /> Learn about Agent Tools
            </a>
          </div>
          <figure className="agent-tools-visual">
            <img src="/agent-tools/match-edition-infographic.png" alt="PropertyDealDesk Match Edition workflow illustration" loading="lazy" />
          </figure>
        </section>
      </div>
    </main>
  );
}
