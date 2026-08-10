import { AlertTriangle, ExternalLink, Handshake, LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { CatalogueFilters } from "../components/CatalogueFilters";
import { ContactActions } from "../components/ContactActions";
import { ProfilePanel } from "../components/ProfilePanel";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { useInventory } from "../hooks";
import { compareRecentlyUpdated, formatDateTime } from "../utils/listing";
import { buildLocationOptions, matchesKeywordSearch, matchesLocationFilter } from "../utils/locationFilter";

const defaultIntent = "WTL";
const defaults = { keyword: "", intent: defaultIntent, propertyType: "", location: "", minPrice: "", maxPrice: "", bedrooms: "", furnishing: "", sort: "recent" };
const CATALOGUE_STATE_KEY = "pdd-catalogue-state";
const CATALOGUE_SCROLL_KEY = "pdd-catalogue-scroll-y";

function readCatalogueState() {
  if (typeof window === "undefined") return { filters: defaults, catalogueMode: "all", visible: 6 };
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CATALOGUE_STATE_KEY) || "null");
    return {
      filters: saved?.filters && typeof saved.filters === "object" ? { ...defaults, ...saved.filters } : defaults,
      catalogueMode: saved?.catalogueMode === "featured" ? "featured" : "all",
      visible: Number.isInteger(saved?.visible) && saved.visible >= 6 ? saved.visible : 6,
    };
  } catch { return { filters: defaults, catalogueMode: "all", visible: 6 }; }
}

export function HomePage() {
  const { items, meta, locationDictionary, loading, error } = useInventory();
  const initialCatalogueState = useMemo(readCatalogueState, []);
  const [filters, setFilters] = useState(initialCatalogueState.filters);
  const [catalogueMode, setCatalogueMode] = useState(initialCatalogueState.catalogueMode);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(initialCatalogueState.visible);
  const [agentToolsPreviewOpen, setAgentToolsPreviewOpen] = useState(false);
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && key !== "intent" && value).length
    + (filters.intent !== defaultIntent ? 1 : 0)
    + (catalogueMode === "featured" ? 1 : 0);
  const options = useMemo(() => ({
    propertyTypes: [...new Set(items.map((item) => item.propertyType))].sort(),
    locations: buildLocationOptions(items, locationDictionary),
    furnishing: [...new Set(items.map((item) => item.furnishing))].sort(),
  }), [items, locationDictionary]);
  const results = useMemo(() => {
    const filtered = items.filter((item) => {
      return (catalogueMode !== "featured" || item.featured)
        && matchesKeywordSearch(item, filters.keyword)
        && (!filters.intent || item.intent === filters.intent)
        && (!filters.propertyType || item.propertyType === filters.propertyType)
        && matchesLocationFilter(item, filters.location, locationDictionary)
        && (!filters.minPrice || item.price >= Number(filters.minPrice))
        && (!filters.maxPrice || item.price <= Number(filters.maxPrice))
        && (!filters.bedrooms || Number(item.bedrooms || 0) >= Number(filters.bedrooms))
        && (!filters.furnishing || item.furnishing === filters.furnishing);
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (filters.sort === "price-asc") return a.price - b.price;
      if (filters.sort === "price-desc") return b.price - a.price;
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return compareRecentlyUpdated(a, b);
    });
  }, [items, filters, catalogueMode, locationDictionary]);
  const reset = () => { setFilters(defaults); setCatalogueMode("all"); setVisible(6); };
  const updateCatalogueMode = (mode) => {
    setCatalogueMode(mode);
    setVisible(6);
  };
  useEffect(() => {
    try { window.sessionStorage.setItem(CATALOGUE_STATE_KEY, JSON.stringify({ filters, catalogueMode, visible })); } catch { /* storage may be unavailable */ }
  }, [filters, catalogueMode, visible]);
  useEffect(() => {
    const onScroll = () => { try { window.sessionStorage.setItem(CATALOGUE_SCROLL_KEY, String(Math.round(window.scrollY || 0))); } catch { /* storage may be unavailable */ } };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (loading) return undefined;
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = Number(window.sessionStorage.getItem(CATALOGUE_SCROLL_KEY));
        if (Number.isFinite(saved) && saved > 0) window.scrollTo(0, saved);
      } catch { /* storage may be unavailable */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);
  useEffect(() => {
    if (!agentToolsPreviewOpen) return undefined;
    document.body.classList.add("modal-open");
    const onKeyDown = (event) => {
      if (event.key === "Escape") setAgentToolsPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [agentToolsPreviewOpen]);

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
            <h2 id="agent-tools-heading">Never Miss a Match Again</h2>
            <p>PropertyDealDesk Match Edition automatically scans WhatsApp property messages and alerts you when it finds a matching buyer, seller, landlord, tenant or property.</p>
            <ul className="agent-tools-points">
              <li>Works while you focus on your clients</li>
              <li>Get notified only when there&apos;s a match</li>
              <li>Spend less time searching, more time closing</li>
            </ul>
            <a className="button primary" href="https://agenttools.myeviv.com/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} /> Learn about Agent Tools
            </a>
          </div>
          <figure className="agent-tools-visual">
            <button className="agent-tools-visual-button" type="button" onClick={() => setAgentToolsPreviewOpen(true)} aria-label="Open larger PropertyDealDesk Match Edition workflow illustration">
              <img src="/agent-tools/match-edition-infographic.png" alt="PropertyDealDesk Match Edition workflow illustration" loading="lazy" />
              <span>Tap to enlarge</span>
            </button>
          </figure>
        </section>
        {agentToolsPreviewOpen ? (
          <div className="agent-tools-lightbox" role="presentation" onMouseDown={() => setAgentToolsPreviewOpen(false)}>
            <section className="agent-tools-lightbox-card" role="dialog" aria-modal="true" aria-labelledby="agent-tools-preview-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="agent-tools-lightbox-heading">
                <div>
                  <span className="eyebrow">Agent Tools preview</span>
                  <h2 id="agent-tools-preview-title">PropertyDealDesk Match Edition workflow</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => setAgentToolsPreviewOpen(false)} aria-label="Close Agent Tools infographic preview" autoFocus>
                  <X size={20} />
                </button>
              </div>
              <img src="/agent-tools/match-edition-infographic.png" alt="PropertyDealDesk Match Edition workflow illustration enlarged preview" />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
