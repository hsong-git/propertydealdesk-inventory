import { TrafficSourcesReport, trafficSourceLabel } from "./TrafficSourcesReport";
import { useEffect, useState } from "react";
import { normalizedTrafficSources } from "../utils/normalizedTrafficSources";

export function CloudflareReferrersReport({ snapshot: fallback, host, days, sources = [], campaigns = [] }) {
  const [state, setState] = useState({report: fallback, notice: "", loading: true});
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/cloudflare-sources?host=${encodeURIComponent(host)}&days=${days}`, {cache:"no-store",credentials:"same-origin",signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setState({report:data.report || fallback,notice:data.notice || "",loading:false}); })
      .catch(() => { if (!controller.signal.aborted) setState({report:fallback,notice:"Live refresh unavailable; showing dated snapshot.",loading:false}); });
    return () => controller.abort();
  }, [host, days, fallback]);
  const snapshot = state.report;
  const chart = normalizedTrafficSources(sources, snapshot);
  const percent = value => value === null ? "—" : `${value.toFixed(1)}%`;
  return <section className="analytics-card analytics-normalized-sources" aria-label="Normalized traffic sources and leads">
    <h2>Traffic sources and leads</h2>
    <p className="analytics-table-note">{host} · {days} days · source share, normalized to 100% for each dataset.</p>
    <div className="analytics-source-legend"><span><i className="website" /> Website · {chart.sessionTotal} tab sessions</span><span><i className="cloudflare" /> Cloudflare · {snapshot ? `≈${chart.visitTotal} visits` : "unavailable"}</span></div>
    <div className="analytics-source-axis" aria-hidden="true"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
    <div className="analytics-referrer-bars">{chart.rows.map(row => {
      const label = row.source === "unknown" ? "Unknown / unrecorded" : trafficSourceLabel(row.source);
      return <div className="analytics-normalized-source" key={row.source}>
        <h3>{label}</h3>
        <div className="analytics-source-series" title={`${row.sessions} website sessions`}><span>Website</span><div className="analytics-referrer-track" aria-hidden="true"><div className="analytics-referrer-fill website" style={{width:`${row.sessionPercent || 0}%`}} /></div><strong>{percent(row.sessionPercent)}</strong></div>
        <div className="analytics-source-series" title={`${row.visits} estimated Cloudflare visits`}><span>Cloudflare</span><div className="analytics-referrer-track" aria-hidden="true"><div className="analytics-referrer-fill" style={{width:`${row.visitPercent || 0}%`}} /></div><strong>{percent(row.visitPercent)}</strong></div>
        {row.inquiries || row.whatsappClicks ? <small>Website actions: {row.whatsappClicks} WhatsApp clicks · {row.inquiries} inquiries</small> : null}
      </div>;
    })}</div>
    {!chart.rows.length ? <p className="analytics-table-note">No source data available.</p> : null}
    <p className="analytics-table-note">Two independent totals, not added together. Coverage and measurement differ; Cloudflare visits cannot be assigned to website leads. Unknown combines unrecorded historical sources and direct/unknown traffic—not assumed WhatsApp.</p>
    {snapshot ? <p className="analytics-table-note">Cloudflare: {snapshot.period.startDay}–{snapshot.period.endDay} · {snapshot.mode === "live" ? "live API report" : "dated snapshot, not live"} · captured {new Date(snapshot.capturedAt).toLocaleString("en-MY",{timeZone:"Asia/Kuala_Lumpur"})} MYT · bots excluded; may be sampled and include admin traffic.</p> : <p className="analytics-table-note">{state.loading ? "Loading Cloudflare sources…" : "Cloudflare data unavailable; website series still shown."}</p>}
    {state.notice ? <p className="analytics-table-note">{state.notice}</p> : null}
    <details className="analytics-source-details"><summary>Lead counts and attribution details</summary><TrafficSourcesReport sources={sources} campaigns={campaigns} embedded />
      {snapshot?.rows.map(row => <p className="analytics-table-note" key={row.source}>{trafficSourceLabel(row.source)}: {row.referrers}</p>)}
    </details>
    {snapshot ? <a className="button secondary" href={snapshot.reportUrl} target="_blank" rel="noopener noreferrer">View latest report in Cloudflare</a> : null}
    {snapshot?.limited ? <p className="analytics-table-note">Referrer group limit reached; this report may be incomplete.</p> : null}
  </section>;
}
