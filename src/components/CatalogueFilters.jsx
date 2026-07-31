import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

const intentOptions = [
  { key: "WTL", label: "WTL" },
  { key: "WTS", label: "WTS" },
];
const catalogueModes = [
  { key: "all", label: "All" },
  { key: "featured", label: "Featured" },
];

export function CatalogueFilters({ filters, setFilters, options, activeCount, onReset, mobileOpen, setMobileOpen, catalogueMode, setCatalogueMode }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <section className="catalogue-controls" aria-label="Property search and filters">
      <div className="search-row">
        <label className="search-field"><Search size={20} /><span className="sr-only">Search properties</span><input value={filters.keyword} onChange={(event) => update("keyword", event.target.value)} placeholder="Search by area, property type or listing code" /></label>
        <button className="button secondary mobile-filter-button" type="button" onClick={() => setMobileOpen(true)}><SlidersHorizontal size={18} /> Filters {activeCount ? <b>{activeCount}</b> : null}</button>
        <label className="sort-field"><span>Sort</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="recent">Recently updated</option><option value="newest">Newest</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option><option value="title">Property title</option></select><ChevronDown size={16} /></label>
      </div>
      <div className={`advanced-filter-shell ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="filter-drawer-heading"><strong>Filter properties</strong><button className="icon-button" type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters"><X size={20} /></button></div>
        <div className="filter-grid">
          <fieldset className="filter-toggle-field">
            <legend>Intent</legend>
            <div className="catalogue-mode-toggle intent-toggle" aria-label="Intent">
              {intentOptions.map((intent) => (
                <button
                  key={intent.key}
                  className={filters.intent === intent.key ? "active" : ""}
                  type="button"
                  aria-pressed={filters.intent === intent.key}
                  onClick={() => update("intent", intent.key)}
                >
                  {intent.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label>Property type<select value={filters.propertyType} onChange={(event) => update("propertyType", event.target.value)}><option value="">All types</option>{options.propertyTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Location<select value={filters.location} onChange={(event) => update("location", event.target.value)}><option value="">All locations</option>{options.locations.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Minimum price<input type="number" min="0" step="100" value={filters.minPrice} onChange={(event) => update("minPrice", event.target.value)} placeholder="No minimum" /></label>
          <label>Maximum price<input type="number" min="0" step="100" value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)} placeholder="No maximum" /></label>
          <label>Bedrooms<select value={filters.bedrooms} onChange={(event) => update("bedrooms", event.target.value)}><option value="">Any bedrooms</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
          <label>Furnishing<select value={filters.furnishing} onChange={(event) => update("furnishing", event.target.value)}><option value="">Any furnishing</option>{options.furnishing.map((value) => <option key={value}>{value}</option>)}</select></label>
          <fieldset className="filter-toggle-field filter-view-field">
            <legend>Inventory view</legend>
            <div className="catalogue-mode-toggle inventory-view-toggle" aria-label="Inventory view">
              {catalogueModes.map((mode) => (
                <button
                  key={mode.key}
                  className={catalogueMode === mode.key ? "active" : ""}
                  type="button"
                  aria-pressed={catalogueMode === mode.key}
                  onClick={() => setCatalogueMode(mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="filter-footer"><button className="reset-button" type="button" onClick={onReset} disabled={!activeCount}><RotateCcw size={16} /> Reset Filters</button><button className="button primary apply-filter-button" type="button" onClick={() => setMobileOpen(false)}>Show results</button></div>
      </div>
      {mobileOpen ? <button className="filter-backdrop" type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)} /> : null}
    </section>
  );
}
