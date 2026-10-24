import { trafficSourceLabel } from "./TrafficSourcesReport";
import { useEffect, useState } from "react";

export function CloudflareReferrersReport({ snapshot: fallback, host, days }) {
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
  if (!snapshot) return <section className="analytics-card"><h2>Cloudflare · existing traffic sources</h2><p>{state.loading ? "Loading sources…" : "No Cloudflare report available for this selection."}</p></section>;
  return <section className="analytics-card" aria-label="Historical Cloudflare sources">
    <h2>Cloudflare · existing traffic sources</h2>
    <p className="analytics-table-note">{snapshot.site_host} · {snapshot.days} days · {snapshot.period.startDay} to {snapshot.period.endDay} · Malaysia time. {snapshot.mode === "live" ? "Live API report" : "Dated snapshot, not a live feed"}; captured {new Date(snapshot.capturedAt).toLocaleString("en-MY",{timeZone:"Asia/Kuala_Lumpur"})}. {state.loading ? "Checking for live data…" : state.notice}</p>
    <div className="analytics-referrer-bars">{snapshot.rows.map((row) => {
      const percentage = snapshot.totalVisits ? (row.visits / snapshot.totalVisits * 100) : 0;
      return <div className="analytics-referrer-row" key={row.source}>
        <span>{trafficSourceLabel(row.source)}</span><strong>≈{row.visits} visits · {percentage.toFixed(1)}%</strong>
        <div className="analytics-referrer-track" aria-hidden="true"><div className={`analytics-referrer-fill ${row.source === "direct_unknown" ? "unknown" : ""}`} style={{ width: `${percentage}%` }} /></div>
        <small className="analytics-source-content">{row.referrers}</small>
      </div>;
    })}</div>
    <p className="analytics-table-note">≈{snapshot.totalVisits} Cloudflare visits; bots excluded. Counts may be sampled/estimated and can include administration traffic. Visits are not people or this dashboard&apos;s tab sessions. No identifiable WhatsApp referrer is shown; unknown visits must not be assumed to be WhatsApp. These totals cannot be assigned to historical leads.</p>
    <a className="button secondary" href={snapshot.reportUrl} target="_blank" rel="noopener noreferrer">View latest report in Cloudflare</a>
    {snapshot.limited ? <p className="analytics-table-note">Referrer group limit reached; this report may be incomplete.</p> : null}
  </section>;
}
