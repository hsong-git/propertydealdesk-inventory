import { TrafficSourcesReport, trafficSourceLabel } from "./TrafficSourcesReport";
import { useEffect, useState } from "react";
import { simpleTrafficSources } from "../utils/normalizedTrafficSources";

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
  const chart = simpleTrafficSources(sources, snapshot);
  const cloudflare = chart.dataset === "cloudflare";
  const unit = cloudflare ? "visits" : "sessions";
  return <section className="analytics-card analytics-simple-sources" aria-label="Traffic sources and leads">
    <div className="analytics-simple-heading"><h2>Traffic sources</h2><span>{days} days</span></div>
    <p className="analytics-table-note">{cloudflare ? "Cloudflare" : "Website"} · {cloudflare ? "≈" : ""}{chart.total.toLocaleString()} {cloudflare ? "estimated visits" : "tab sessions"}
      {cloudflare && snapshot?.mode !== "live" ? <span className="analytics-snapshot-label">Snapshot · {new Date(snapshot.capturedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kuala_Lumpur"})}</span> : null}
    </p>
    <div className="analytics-simple-bars">{chart.rows.map(row => <div className="analytics-simple-source" key={row.source}>
      <div><strong>{row.source === "unknown" ? "Direct / unknown" : trafficSourceLabel(row.source)}</strong><span><strong>{row.percent?.toFixed(1)}%</strong><small>{row.count.toLocaleString()} {unit}</small></span></div>
      <div className="analytics-referrer-track" aria-hidden="true"><div className={`analytics-referrer-fill ${row.source === "unknown" ? "unknown" : ""}`} style={{width:`${row.percent || 0}%`}} /></div>
    </div>)}</div>
    {!chart.rows.length ? <p className="analytics-table-note">{state.loading ? "Loading sources…" : "No traffic recorded."}</p> : null}
    <div className="analytics-simple-leads" aria-label="Website activity"><div><strong>{chart.whatsappClicks}</strong><span>WhatsApp clicks</span></div><div><strong>{chart.inquiries}</strong><span>Inquiries</span></div></div>
    <p className="analytics-simple-caption">Website activity · not attributed to the sources above</p>
    <details className="analytics-source-details"><summary>More details</summary>
      <p className="analytics-table-note">One dataset is shown at a time: Cloudflare visits when available, otherwise website tab sessions. Counts are not combined. Unknown is not assumed to mean WhatsApp.</p>
      {snapshot ? <p className="analytics-table-note">Cloudflare period: {snapshot.period.startDay}–{snapshot.period.endDay}, Malaysia time. {snapshot.mode === "live" ? "Live report." : "Dated snapshot, not a live feed."} Bots excluded; counts may be sampled and can include administration traffic.</p> : null}
      {state.notice ? <p className="analytics-table-note">{state.notice}</p> : null}
      <TrafficSourcesReport sources={sources} campaigns={campaigns} embedded />
      {snapshot?.rows.map(row => <p className="analytics-table-note" key={row.source}>{trafficSourceLabel(row.source)}: {row.referrers}</p>)}
      {snapshot ? <a href={snapshot.reportUrl} target="_blank" rel="noopener noreferrer">Open Cloudflare report ↗</a> : null}
    </details>
    {cloudflare && snapshot?.limited ? <p className="analytics-table-note">Source report may be incomplete.</p> : null}
  </section>;
}
