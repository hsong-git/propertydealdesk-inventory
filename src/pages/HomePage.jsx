import { useSiteLanguage } from "../components/InquiryLanguage";
import { AlertTriangle, ArrowDown, ArrowRight, Handshake, House, KeyRound, LoaderCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { createSearchLink, searchShareTarget } from "../utils/searchShare.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { CatalogueFilters } from "../components/CatalogueFilters";
import { ContactActions } from "../components/ContactActions";
import { ProfilePanel } from "../components/ProfilePanel";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { homeShareSeo } from "../utils/seo.js";
import { useInventory } from "../hooks";
import { compareRecentlyUpdated, formatDateTime, normalizeInventoryFilter } from "../utils/listing";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";
import { buildLocationOptions, buildLocationCounts } from "../utils/locationFilter";
import { normalizeMultiFilters, readFilterParams, writeFilterParams } from "../utils/multiSelect.js";
import { matchesCatalogueFilters, normalizeCatalogueIntent, offerForIntent } from "../utils/catalogueFilter.js";
import { analyticsSource, trackEvent } from "../utils/analytics.js";
import { AreaLinks } from "../components/AreaLinks";
import { compareNewlyAdded } from "../utils/listing.js";

const defaultIntent = "";
const INITIAL_VISIBLE_COUNT = 6;
const LOAD_MORE_COUNT = 6;
const NEW_LISTING_COUNT = 12;
const defaults = { keyword: "", intent: defaultIntent, propertyType: [], location: [], minPrice: "", maxPrice: "", bedrooms: "", furnishing: [], sort: "newest", classification: "" };
const CATALOGUE_STATE_KEY = "pdd-catalogue-state";
const CATALOGUE_SCROLL_KEY = "pdd-catalogue-scroll-y";
const shareableFilterKeys = {
  keyword: "q",
  intent: "intent",
  propertyType: "type",
  location: "location",
  minPrice: "min",
  maxPrice: "max",
  bedrooms: "beds",
  furnishing: "furnishing",
  sort: "sort",
  classification: "inventory",
};

function readSharedCatalogueState() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const hasSharedFilters = Object.values(shareableFilterKeys).some((key) => params.has(key)) || params.has("view");
  if (!hasSharedFilters) return null;
  const filters = readFilterParams(params, shareableFilterKeys, defaults);
  filters.intent = normalizeCatalogueIntent(filters.intent);
  filters.classification = COMBINED_CATALOGUE ? normalizeInventoryFilter(filters.classification) : "";
  return {
    filters: { ...defaults, ...filters },
    catalogueMode: "all",
    visible: INITIAL_VISIBLE_COUNT,
  };
}

function catalogueSearchParams(filters, catalogueMode) {
  const params = writeFilterParams(filters, shareableFilterKeys, defaults);
  return params;
}

function readCatalogueState() {
  if (typeof window === "undefined") return { filters: defaults, catalogueMode: "all", visible: INITIAL_VISIBLE_COUNT };
  const shared = readSharedCatalogueState();
  if (shared) return shared;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CATALOGUE_STATE_KEY) || "null");
    return {
      filters: saved?.filters && typeof saved.filters === "object" ? normalizeMultiFilters({ ...defaults, ...saved.filters, intent: saved.intentDefaultVersion === 2 ? normalizeCatalogueIntent(saved.filters.intent) : defaultIntent, classification: COMBINED_CATALOGUE ? normalizeInventoryFilter(saved.filters.classification) : "" }) : defaults,
      catalogueMode: "all",
      visible: INITIAL_VISIBLE_COUNT,
    };
  } catch { return { filters: defaults, catalogueMode: "all", visible: INITIAL_VISIBLE_COUNT }; }
}

export function HomePage() {
  const { t: tSite } = useSiteLanguage();
  const { items, meta, locationDictionary, loading, error } = useInventory();
  const trafficSource = useMemo(analyticsSource, []);
  const initialCatalogueState = useMemo(readCatalogueState, []);
  const [filters, setFilters] = useState(initialCatalogueState.filters);
  const catalogueMode = "all";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(initialCatalogueState.visible);
  const [shareCopied, setShareCopied] = useState(false);
  const [shortSearch, setShortSearch] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const analyticsReady = useRef(false);
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && key !== "intent" && (Array.isArray(value) ? value.length : value)).length
    + (filters.intent !== defaultIntent ? 1 : 0);
  const options = useMemo(() => ({
    propertyTypes: [...new Set(items.map((item) => item.propertyType))].sort(),
    locations: buildLocationOptions(items, locationDictionary),
    locationCounts: buildLocationCounts(items.filter(item => matchesCatalogueFilters(item, filters, catalogueMode, locationDictionary, { ignoreLocation: true })), locationDictionary),
    furnishing: [...new Set(items.map((item) => item.furnishing))].sort(),
  }), [items, locationDictionary, filters, catalogueMode]);
  const results = useMemo(() => {
    const filtered = items.filter(item => matchesCatalogueFilters(item, filters, catalogueMode, locationDictionary));
    return [...filtered].sort((a, b) => {
      if (filters.sort === "newest") return compareNewlyAdded(a, b);
      if (filters.sort === "price-asc") return offerForIntent(a, filters.intent).price - offerForIntent(b, filters.intent).price;
      if (filters.sort === "price-desc") return offerForIntent(b, filters.intent).price - offerForIntent(a, filters.intent).price;
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      return compareRecentlyUpdated(a, b);
    });
  }, [items, filters, catalogueMode, locationDictionary]);
  const newListingIds = useMemo(() => new Set([...results].sort(compareNewlyAdded).slice(0, NEW_LISTING_COUNT).map(item => item.publicId)), [results]);
  const reset = () => { setFilters(defaults); setVisible(INITIAL_VISIBLE_COUNT); };
  const loadMore = (method) => {
    setVisible((count) => {
      const next = Math.min(count + LOAD_MORE_COUNT, results.length);
      if (next > count) trackEvent("catalogue_more_loaded", { intent: filters.intent, properties: { method, visible_count: next, result_count: results.length } });
      return next;
    });
  };
  useEffect(() => {
    setVisible(INITIAL_VISIBLE_COUNT);
  }, [filters, catalogueMode]);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return searchShareTarget(catalogueSearchParams(filters, catalogueMode), window.location.origin).href;
  }, [filters, catalogueMode]);
  useEffect(() => { setShareCopied(false); setShareError(""); }, [shareUrl]);
  const shareSearch = async () => {
    if (!shareUrl || shareBusy) return;
    setShareError("");
    try {
      let shortUrl = shortSearch?.target === shareUrl ? shortSearch.url : "";
      if (!shortUrl) {
        setShareBusy(true);
        shortUrl = await createSearchLink(new URL(shareUrl));
        setShortSearch({ target: shareUrl, url: shortUrl });
        // Native sharing needs a fresh tap after the network request.
        if (typeof navigator.share === "function") return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Property search", url: shortUrl });
        trackEvent("catalogue_search_shared", { intent: filters.intent, properties: { method: "native", result_count: results.length } });
        return;
      }
      try { await navigator.clipboard.writeText(shortUrl); }
      catch { window.prompt("Copy this short search link:", shortUrl); }
      trackEvent("catalogue_search_shared", { intent: filters.intent, properties: { method: "clipboard", result_count: results.length } });
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (error) {
      if (error?.name === "AbortError") return;
      setShareError(error.message || "Unable to share search. Please try again.");
    } finally { setShareBusy(false); }
  };
  useEffect(() => {
    try { window.sessionStorage.setItem(CATALOGUE_STATE_KEY, JSON.stringify({ intentDefaultVersion: 2, filters, catalogueMode, visible })); } catch { /* storage may be unavailable */ }
  }, [filters, catalogueMode, visible]);
  useEffect(() => {
    if (loading || error) return;
    trackEvent("catalogue_view", { intent: filters.intent, properties: { result_count: results.length, source: trafficSource } });
  }, [loading, error]);
  useEffect(() => {
    if (loading || error) return undefined;
    if (!analyticsReady.current) { analyticsReady.current = true; return undefined; }
    const timer = window.setTimeout(() => {
      const activeFilters = Object.entries(filters).filter(([key, value]) => key !== "sort" && (Array.isArray(value) ? value.length : value)).map(([key]) => key);
      trackEvent("catalogue_filter_applied", { intent: filters.intent, properties: { active_filters: activeFilters, result_count: results.length, catalogue_mode: catalogueMode, sort: filters.sort } });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [filters, catalogueMode, results.length, loading, error]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.search = catalogueSearchParams(filters, catalogueMode).toString();
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filters, catalogueMode]);
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

  return (
    <main>
      <Seo {...homeShareSeo} />
      <div className="page-width home-stack">
        <ProfilePanel />
        {tSite(meta?.isMockData ? (
          <section className="development-data-notice" role="status">
            <AlertTriangle size={20} />
            <div><strong>{tSite("Development preview — mock inventory")}</strong><span>{tSite(meta.notice)}</span></div>
          </section>
        ) : null)}
        <section id="properties" className="catalogue-section">
          <div className="section-heading">
            <div><span className="eyebrow">{tSite("Public property listings")}</span><h2>{tSite(agentProfile.catalogueHeading)}</h2><p>{tSite("Explore current opportunities and contact me directly to confirm details or arrange a viewing.")}</p></div>
            <div className="catalogue-count"><strong>{tSite(results.length)}</strong><span>{tSite("matching ")}{tSite(results.length === 1 ? "property" : "properties")}</span>{tSite(meta ? <small>{tSite("Inventory ")}{tSite(meta.inventoryVersion)}{tSite(" · ")}{tSite(meta.isMockData ? "generated" : "published")} {tSite(formatDateTime(meta.publishedAt || meta.generatedAt))}</small> : null)}</div>
          </div>
          <CatalogueFilters filters={filters} setFilters={setFilters} options={options} activeCount={activeCount} onReset={reset} onShare={shareSearch} shareCopied={shareCopied} shareBusy={shareBusy} shareError={shareError} shareReady={shortSearch?.target === shareUrl && typeof navigator.share === "function"} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          {tSite(loading ? <div className="state-card"><LoaderCircle className="spin" /><strong>{tSite("Loading public inventory…")}</strong></div> : null)}
          {tSite(error ? <div className="state-card error"><strong>{tSite(error)}</strong><span>{tSite("Please refresh the page or contact HS Ong directly.")}</span></div> : null)}
          {tSite(!loading && !error && results.length ? <div className="property-grid">{tSite(results.slice(0, visible).map((listing) => <PropertyCard key={listing.publicId} listing={listing} displayIntent={filters.intent} isNew={newListingIds.has(listing.publicId)} />))}</div> : null)}
          {tSite(!loading && !error && !results.length ? <div className="state-card"><strong>{tSite(items.length ? "No properties match these filters." : "No published properties are currently available.")}</strong><span>{tSite(items.length ? "Try clearing one or more filters to see other opportunities." : "Please check back after the next approved inventory publication.")}</span>{tSite(items.length ? <button className="button secondary" type="button" onClick={reset}>{tSite("Reset Filters")}</button> : null)}</div> : null)}
          {!loading && !error && visible < results.length ? <div className="load-more"><button className="button primary catalogue-show-more" type="button" onClick={() => loadMore("button")}><span>{tSite("Show more")}</span><ArrowDown size={18} aria-hidden="true" /></button></div> : null}
          <AreaLinks allLocations counts={options.locationCounts} searchParams={catalogueSearchParams(filters, catalogueMode)} />
        </section>
        <section className="home-journey" aria-labelledby="home-journey-heading">
          <span className="eyebrow">{tSite("Property made simple")}</span>
          <h2 id="home-journey-heading">{tSite("Three steps closer to home.")}</h2>
          <ol className="home-journey-grid">
            {[
              [Search, "1. Find your property", "Share your requirements and receive matching properties directly via WhatsApp."],
              [House, "2. View & negotiate", "View your preferred properties at your convenience. I'll help negotiate the price and terms."],
              [KeyRound, "3. Secure & collect keys", "From booking and paperwork to key handover, I'll guide you every step of the way."],
            ].map(([Icon, title, description], index) => <li key={title} className={index === 0 ? "journey-start" : ""}>
              <div className="journey-step-heading"><span className="journey-icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true" /></span><span className="journey-step-number" aria-hidden="true">0{index + 1}</span></div>
              <h3>{tSite(title).replace(/^\d+\.\s*/, "")}</h3><p>{tSite(description)}</p>
              {index === 0 ? <Link className="journey-start-link" to="/inquiries">{tSite("Find a Property")}<ArrowRight size={16} aria-hidden="true" /></Link> : null}
            </li>)}
          </ol>
        </section>
        <section className="co-broke-panel">
          <span className="co-broke-icon"><Handshake size={27} /></span>
          <div><span className="eyebrow">{tSite("Working together")}</span><h2>{tSite("Co-broke agents are welcome")}</h2><p>{tSite(agentProfile.coBrokeMessage)}</p></div>
          <ContactActions
            includeCall={false}
            includeWhatsApp
            whatsappLabel={tSite("Contact HS Ong")}
            message={`Hi ${agentProfile.displayName}, I am a real estate agent and would like to ask about current co-broke opportunities, available listings and viewing arrangements.`}
          />
        </section>
      </div>
    </main>
  );
}
