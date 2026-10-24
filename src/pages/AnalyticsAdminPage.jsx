import { BarChart3, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { useInventory } from "../hooks";
import { AnalyticsTrendChart } from "../components/AnalyticsTrendChart";
import { analyticsTrend } from "../utils/analyticsTrend";
import { CloudflareReferrersReport } from "../components/CloudflareReferrersReport";

const EVENT_LABELS = {
  catalogue_view: "Catalogue sessions", catalogue_filter_applied: "Filter uses", listing_open: "Listing opens",
  listing_view: "Detail views", whatsapp_click: "WhatsApp clicks", share_property: "Property shares",
  copy_posting: "Posting copies", photo_share: "Photo shares", inquiry_started: "Inquiry starts",
  inquiry_step_completed: "Inquiry steps", inquiry_submitted: "Inquiry submissions", inquiry_whatsapp_click: "Inquiry WhatsApp clicks",
  media_open: "Media opens", photo_view: "Full photo views", catalogue_search_shared: "Shared searches", catalogue_more_loaded: "More results loaded",
};

const hostLabel = (host) => host === "property.myeviv.com" ? "Property" : host === "scmi.myeviv.com" ? "SCMI" : host;

function AnalyticsListingLink({ code, listing }) {
  const photo = listing?.photos?.[0];
  const tooltipId = `analytics-listing-preview-${code.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
  return <span className="analytics-listing-preview">
    <a href={`/i/${code}`} aria-describedby={photo ? tooltipId : undefined}><strong>{code}</strong></a>
    {photo ? <span className="analytics-listing-tooltip" id={tooltipId} role="tooltip">
      <img src={photo} alt="" loading="lazy" />
      <span><strong>{code}</strong><small>{listing.title}</small></span>
    </span> : null}
  </span>;
}

export function AnalyticsAdminPage() {
  const inventory = useInventory();
  const [days, setDays] = useState(30);
  const [host, setHost] = useState("property.myeviv.com");
  const [state, setState] = useState({ loading: true, allowed: true, data: null, error: "" });
  const requestId = useRef(0);
  const load = async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json();
      if (id !== requestId.current) return;
      setState({ loading: false, allowed: response.status !== 401, data: response.ok ? payload : null, error: response.ok ? "" : payload.error || "Unable to load analytics." });
    } catch { if (id === requestId.current) setState({ loading: false, allowed: false, data: null, error: "Unable to load analytics." }); }
  };
  useEffect(() => { load(); }, [days]);
  const filtered = useMemo(() => {
    const data = state.data || {};
    const byHost = (rows) => (rows || []).filter((row) => row.site_host === host);
    return { summary: byHost(data.summary)[0] || {}, funnel: byHost(data.funnel), sources: byHost(data.sources), campaigns: byHost(data.campaigns), listings: byHost(data.listings), daily: byHost(data.daily) };
  }, [state.data, host]);
  const trend = useMemo(() => analyticsTrend(filtered.daily, state.data?.period), [filtered.daily, state.data?.period]);
  const listingByCode = useMemo(() => {
    const result = new Map();
    for (const listing of inventory.allItems) {
      result.set(listing.code.toUpperCase(), listing);
      if (listing.displayCode) result.set(listing.displayCode.toUpperCase(), listing);
    }
    return result;
  }, [inventory.allItems]);
  if (state.loading && !state.data) return <main className="page-width page-state"><strong>Loading traffic analytics…</strong></main>;
  if (!state.allowed) return <main className="page-width page-state"><Seo title="Administrator access required | HS Ong Property Inventory" /><strong>Administrator access required</strong><Link className="button secondary" to="/admin">Back to Administration</Link></main>;
  const eventCount = (name) => Number(filtered.funnel.find((item) => item.event_name === name)?.count || 0);
  const sessionCount = Number(filtered.summary.sessions || 0);
  const inquiryRate = sessionCount ? ((eventCount("inquiry_submitted") / sessionCount) * 100).toFixed(1) : "0.0";
  return <main className="page-width admin-analytics-page">
    <Seo title="Traffic analytics | HS Ong Property Inventory" />
    <header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Traffic and lead analytics</h1><p>First-party, privacy-conscious funnel activity separated by website. A session lasts for the visitor&apos;s current browser tab and does not identify a person.</p></header>
    <section className="analytics-controls"><div className="catalogue-mode-toggle">{["property.myeviv.com", "scmi.myeviv.com"].map((item) => <button key={item} className={host === item ? "active" : ""} type="button" onClick={() => setHost(item)}>{hostLabel(item)}</button>)}</div><label>Period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label><button className="button secondary" type="button" onClick={load}><RefreshCw size={16} /> Refresh</button></section>
    {state.error ? <p className="requirement-alert error">{state.error}</p> : null}
    <section className="analytics-kpis" aria-label={`${hostLabel(host)} performance`}><article><span>Sessions</span><strong>{sessionCount}</strong></article><article><span>Listing views</span><strong>{eventCount("listing_view")}</strong></article><article><span>WhatsApp clicks</span><strong>{eventCount("whatsapp_click")}</strong></article><article><span>Inquiries</span><strong>{eventCount("inquiry_submitted")}</strong></article><article><span>Inquiry/session</span><strong>{inquiryRate}%</strong></article></section>
    <section className="analytics-card analytics-trends" aria-label="Daily performance graphs" aria-busy={state.loading}>
      <h2>Daily performance · {hostLabel(host)}</h2>
      <p className="analytics-table-note">{state.loading ? "Updating selected period…" : `${state.data?.days || days} days · ${state.data?.period?.startDay || ""} to ${state.data?.period?.endDay || ""}`} · Malaysia time. Today is partial. Hover, tap or choose a date for details.</p>
      <div className="analytics-trend-grid">
        <AnalyticsTrendChart title="Sessions" metric="sessions" points={trend} />
        <AnalyticsTrendChart title="Listing views" metric="listing_views" points={trend} />
        <AnalyticsTrendChart title="WhatsApp clicks" metric="whatsapp_clicks" points={trend} />
        <AnalyticsTrendChart title="Inquiries" metric="inquiries" points={trend} />
        <AnalyticsTrendChart title="Inquiry/session (%)" metric="inquiry_rate" points={trend} percent />
      </div>
      <p className="analytics-table-note">Daily rate = inquiries ÷ that day's sessions. A session active on multiple days counts on each day; the period total counts it once. Zero means no recorded activity.</p>
    </section>
    <CloudflareReferrersReport key={`${host}-${days}`} host={host} days={days} sources={filtered.sources} campaigns={filtered.campaigns} snapshot={state.data?.cloudflareSnapshots?.find((item) => item.site_host === host && item.days === days)} />
    <div className="analytics-grid">
      <section className="analytics-card"><h2><BarChart3 size={19} /> Funnel activity</h2><table><thead><tr><th>Action</th><th>Events</th><th>Sessions</th></tr></thead><tbody>{filtered.funnel.map((row) => <tr key={row.event_name}><td>{EVENT_LABELS[row.event_name] || row.event_name}</td><td>{row.count}</td><td>{row.sessions}</td></tr>)}</tbody></table></section>
      <section className="analytics-card top-listings-card"><h2>Top listings</h2><p className="analytics-table-note">Views count every detail-page view. Sessions count distinct browser-tab sessions.</p><table><thead><tr><th>Listing</th><th><abbr title="Total property detail-page views, including repeat views">Views</abbr></th><th><abbr title="Distinct browser-tab sessions that viewed the property">Sessions</abbr></th></tr></thead><tbody>{filtered.listings.map((row) => { const code = row.listing_code.toUpperCase(); const listing = listingByCode.get(code) || listingByCode.get(code.replace(/^CMI-/, "")); return <tr key={row.listing_code}><td><AnalyticsListingLink code={row.listing_code} listing={listing} /></td><td>{row.views}</td><td>{row.sessions}</td></tr>; })}</tbody></table></section>
      <section className="analytics-card"><h2>Daily sessions</h2><table><thead><tr><th>Date</th><th>Sessions</th></tr></thead><tbody>{filtered.daily.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.sessions}</td></tr>)}</tbody></table></section>
    </div>
  </main>;
}

