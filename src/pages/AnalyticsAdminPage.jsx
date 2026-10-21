import { BarChart3, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

const EVENT_LABELS = {
  catalogue_view: "Catalogue sessions", catalogue_filter_applied: "Filter uses", listing_open: "Listing opens",
  listing_view: "Detail views", whatsapp_click: "WhatsApp clicks", share_property: "Property shares",
  copy_posting: "Posting copies", photo_share: "Photo shares", inquiry_started: "Inquiry starts",
  inquiry_step_completed: "Inquiry steps", inquiry_submitted: "Inquiry submissions", inquiry_whatsapp_click: "Inquiry WhatsApp clicks",
  media_open: "Media opens", photo_view: "Full photo views", catalogue_search_shared: "Shared searches", catalogue_more_loaded: "More results loaded",
};

const hostLabel = (host) => host === "property.myeviv.com" ? "Property" : host === "scmi.myeviv.com" ? "SCMI" : host;

export function AnalyticsAdminPage() {
  const [days, setDays] = useState(30);
  const [host, setHost] = useState("property.myeviv.com");
  const [state, setState] = useState({ loading: true, allowed: true, data: null, error: "" });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json();
      setState({ loading: false, allowed: response.status !== 401, data: response.ok ? payload : null, error: response.ok ? "" : payload.error || "Unable to load analytics." });
    } catch { setState({ loading: false, allowed: false, data: null, error: "Unable to load analytics." }); }
  };
  useEffect(() => { load(); }, [days]);
  const filtered = useMemo(() => {
    const data = state.data || {};
    const byHost = (rows) => (rows || []).filter((row) => row.site_host === host);
    return { summary: byHost(data.summary)[0] || {}, funnel: byHost(data.funnel), sources: byHost(data.sources), listings: byHost(data.listings), daily: byHost(data.daily) };
  }, [state.data, host]);
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
    <div className="analytics-grid"><section className="analytics-card"><h2><BarChart3 size={19} /> Funnel activity</h2><table><thead><tr><th>Action</th><th>Events</th><th>Sessions</th></tr></thead><tbody>{filtered.funnel.map((row) => <tr key={row.event_name}><td>{EVENT_LABELS[row.event_name] || row.event_name}</td><td>{row.count}</td><td>{row.sessions}</td></tr>)}</tbody></table></section><section className="analytics-card"><h2>Traffic sources</h2><table><thead><tr><th>Source</th><th>Sessions</th></tr></thead><tbody>{filtered.sources.map((row) => <tr key={row.source}><td>{row.source}</td><td>{row.sessions}</td></tr>)}</tbody></table></section><section className="analytics-card"><h2>Top listings</h2><table><thead><tr><th>Listing</th><th>Views</th><th>Sessions</th></tr></thead><tbody>{filtered.listings.map((row) => <tr key={row.listing_code}><td><a href={`/i/${row.listing_code}`}><strong>{row.listing_code}</strong></a></td><td>{row.views}</td><td>{row.sessions}</td></tr>)}</tbody></table></section><section className="analytics-card"><h2>Daily sessions</h2><table><thead><tr><th>Date</th><th>Sessions</th></tr></thead><tbody>{filtered.daily.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.sessions}</td></tr>)}</tbody></table></section></div>
  </main>;
}

