import { useSiteLanguage } from "./InquiryLanguage";
import { Check, ChevronDown, RotateCcw, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";
import { MultiSelectFilter } from "./MultiSelectFilter.jsx";

const intentOptions = [
  { key: "", label: "All" },
  { key: "WTL", label: "WTL" },
  { key: "WTS", label: "WTS" },
];

export function CatalogueFilters({ filters, setFilters, options, activeCount, onReset, onShare, shareCopied, shareBusy, shareReady, shareError, mobileOpen, setMobileOpen }) {
  const { t: tSite } = useSiteLanguage();
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <section className="catalogue-controls" aria-label={tSite("Property search and filters")}>
      <div className="search-row">
        <label className="search-field"><Search size={20} /><span className="sr-only">{tSite("Search properties")}</span><input value={filters.keyword} onChange={(event) => update("keyword", event.target.value)} placeholder={tSite("Search by area, property type or listing code")} /></label>
        <button className="button secondary mobile-filter-button" type="button" onClick={() => setMobileOpen(true)}><SlidersHorizontal size={18} />{tSite(" Filters ")}{tSite(activeCount ? <b>{tSite(activeCount)}</b> : null)}</button>
        <label className="sort-field"><span>{tSite("Sort")}</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="recent">{tSite("Recently listed")}</option><option value="newest">{tSite("Newest")}</option><option value="price-asc">{tSite("Price low to high")}</option><option value="price-desc">{tSite("Price high to low")}</option><option value="title">{tSite("Property title")}</option></select><ChevronDown size={16} /></label>
      </div>
      <button className="reset-button home-reset-filters" type="button" onClick={onReset} disabled={!activeCount}><RotateCcw size={16} />{tSite(" Reset Filters")}</button>
      <div className="primary-filter-toggles">
      <fieldset className="filter-toggle-field persistent-intent-filter">
        <legend>{tSite("Intent")}</legend>
        <div className="catalogue-mode-toggle intent-toggle" aria-label={tSite("Intent")}>
          {tSite(intentOptions.map((intent) => (
            <button
              key={intent.key}
              className={filters.intent === intent.key ? "active" : ""}
              type="button"
              aria-pressed={filters.intent === intent.key}
              onClick={() => update("intent", intent.key)}
            >
              {tSite(intent.label)}
            </button>
          )))}
        </div>
      </fieldset>
      {tSite(COMBINED_CATALOGUE ? <fieldset className="filter-toggle-field persistent-intent-filter inventory-classification-field">
        <legend>{tSite("Inventory")}</legend>
        <div className="catalogue-mode-toggle inventory-classification-toggle" aria-label={tSite("Inventory classification")}>
          {tSite([{ key: "", label: "All" }, { key: "smi", label: "SMI" }, { key: "cmi", label: "CMI" }].map((option) => (
            <button key={option.label} type="button" className={(filters.classification || "") === option.key ? "active" : ""} aria-pressed={(filters.classification || "") === option.key} onClick={() => update("classification", option.key)}>{tSite(option.label)}</button>
          )))}
        </div>
      </fieldset> : null)}
      </div>
      <div className={`advanced-filter-shell ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="filter-drawer-heading"><strong>{tSite("Filter properties")}</strong><button className="icon-button" type="button" onClick={() => setMobileOpen(false)} aria-label={tSite("Close filters")}><X size={20} /></button></div>
        <div className="filter-grid">
          <MultiSelectFilter label={tSite("Property type")} placeholder={tSite("All types")} options={options.propertyTypes} value={filters.propertyType} onChange={(value) => update("propertyType", value)} />
          <MultiSelectFilter label={tSite("Location")} placeholder={tSite("All locations")} options={options.locations} counts={options.locationCounts} value={filters.location} onChange={(value) => update("location", value)} />
          <label>{tSite("Minimum price")}<input type="number" min="0" step="100" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} placeholder={tSite("No minimum")} /></label>
          <label>{tSite("Maximum price")}<input type="number" min="0" step="100" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} placeholder={tSite("No maximum")} /></label>
          <label>{tSite("Bedrooms")}<select value={filters.bedrooms} onChange={(event) => update("bedrooms", event.target.value)}><option value="">{tSite("Any bedrooms")}</option><option value="1">{tSite("1+")}</option><option value="2">{tSite("2+")}</option><option value="3">{tSite("3+")}</option><option value="4">{tSite("4+")}</option></select></label>
          <MultiSelectFilter label={tSite("Furnishing")} placeholder={tSite("Any furnishing")} options={options.furnishing} value={filters.furnishing} onChange={(value) => update("furnishing", value)} />
        </div>
        <div className="filter-footer"><button className="reset-button" type="button" onClick={onReset} disabled={!activeCount}><RotateCcw size={16} />{tSite(" Reset Filters")}</button><button className="button secondary share-search-button" type="button" onClick={onShare} disabled={shareBusy}>{tSite(shareCopied ? <Check size={16} /> : <Share2 size={16} />)} {tSite(shareBusy ? "Creating link…" : shareCopied ? "Link copied" : shareReady ? "Share link" : "Share search")}</button><button className="button primary apply-filter-button" type="button" onClick={() => setMobileOpen(false)}>{tSite("Show results")}</button></div>
        {tSite(shareReady && !shareBusy ? <p className="text-muted" role="status">{tSite("Short link ready. Tap Share link to choose an app.")}</p> : null)}
        {tSite(shareError ? <p className="form-error" role="alert">{tSite(shareError)}</p> : null)}
      </div>
      {tSite(mobileOpen ? <button className="filter-backdrop" type="button" aria-label={tSite("Close filters")} onClick={() => setMobileOpen(false)} /> : null)}
    </section>
  );
}
