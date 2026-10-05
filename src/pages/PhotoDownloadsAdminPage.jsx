import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { anonymousBrowserLabel } from "../utils/anonymousBrowser";

function browserLabel(userAgent) {
  const value = String(userAgent || "");
  const os = /Android/i.test(value) ? "Android" : /iPhone|iPad|iPod/i.test(value) ? "iOS" : /Windows/i.test(value) ? "Windows" : /Mac OS X/i.test(value) ? "macOS" : /Linux/i.test(value) ? "Linux" : "Unknown OS";
  const browser = /Edg\//i.test(value) ? "Edge" : /Firefox\//i.test(value) ? "Firefox" : /Chrome\//i.test(value) ? "Chrome" : /Safari\//i.test(value) ? "Safari" : "Browser";
  return `${os} · ${browser}`;
}

function shareMethodLabel(method) {
  return method === "native" || method === "app" || method === "web" ? "WhatsApp" : method === "download" ? "Download" : "Other";
}

export function PhotoDownloadsAdminPage() {
  const [state, setState] = useState({ loading: true, allowed: false, available: true, events: [] });
  const [browserFilter, setBrowserFilter] = useState("");
  const load = async () => { setState((current) => ({ ...current, loading: true })); const response = await fetch("/api/admin/photo-downloads", { cache: "no-store", credentials: "same-origin" }); const payload = await response.json(); setState({ loading: false, allowed: response.status !== 401, available: response.ok, events: payload.events || [] }); };
  const removeTestEntries = async () => {
    if (!window.confirm("Remove all photo-sharing audit entries for ONG HUA SEONG? This cannot be undone.")) return;
    const response = await fetch("/api/admin/photo-downloads", { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "ONG HUA SEONG" }) });
    const payload = await response.json();
    if (!response.ok) { window.alert(payload.error || "Unable to remove test entries."); return; }
    await load();
  };
  useEffect(() => { load().catch(() => setState({ loading: false, allowed: false, events: [] })); }, []);
  if (state.loading) return <main className="page-width page-state"><strong>Checking administrator access…</strong></main>;
  if (!state.allowed) return <main className="page-width page-state"><Seo title="Administrator access required | HS Ong Property Inventory" /><strong>Administrator access required</strong><p>This private audit page is not available to public visitors.</p><Link className="button secondary" to="/">Back to Catalogue</Link></main>;
  const testEntryCount = state.events.filter((event) => String(event.name || "").trim().toUpperCase() === "ONG HUA SEONG").length;
  const events = browserFilter ? state.events.filter((event) => event.anonymous_browser_id === browserFilter) : state.events;
  return <main className="page-width admin-downloads-page">
    <Seo title="Photo sharing audit | HS Ong Property Inventory" />
    <header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Photo sharing audit</h1><p>Downloads and WhatsApp share attempts are recorded with SMI code and timestamp. Click an anonymous browser ID to see its repeat activity. IDs identify browsers, not people; clearing cookies or changing devices creates a new ID.</p></header>
    <section className="admin-photo-audit-card">
      <div className="admin-table-summary"><strong>{events.length}</strong><span>{browserFilter ? "matching events in the latest 500" : "photo sharing events"}</span><button type="button" onClick={() => load()}><RefreshCw size={15} /> Refresh</button>{testEntryCount ? <button className="button danger" type="button" onClick={removeTestEntries}><Trash2 size={15} /> Remove my test entries ({testEntryCount})</button> : null}</div>
      {browserFilter ? <p className="anonymous-browser-filter" role="status">Showing {anonymousBrowserLabel(browserFilter)} <button className="button tertiary" type="button" onClick={() => setBrowserFilter("")}>Show all browsers</button></p> : null}
      {state.available ? (events.length ? <div className="photo-audit-table-wrap"><table className="photo-audit-table">
        <thead><tr><th>SMI</th><th>Photos</th><th>Method</th><th>Name</th><th>Anonymous browser ID</th><th>Email</th><th>Contact No.</th><th>Shared at</th><th>Browser</th></tr></thead>
        <tbody>{events.map((event) => <tr key={event.id}>
          <td><a href={`/i/${encodeURIComponent(String(event.listing_code || "").toUpperCase())}`}><strong>{event.listing_code}</strong></a></td><td>{event.photo_count}</td><td>{shareMethodLabel(event.share_client)}</td><td>{event.name}</td>
          <td>{event.anonymous_browser_id ? <button className="anonymous-browser-id" type="button" onClick={() => setBrowserFilter(event.anonymous_browser_id)} aria-label={`Show activity for ${anonymousBrowserLabel(event.anonymous_browser_id)}`}>{anonymousBrowserLabel(event.anonymous_browser_id)}</button> : <span title="Not recorded for historical events">—</span>}</td>
          <td>{event.email}</td><td>{event.contact_number || "—"}</td><td>{new Date(event.shared_at).toLocaleString("en-MY")}</td><td className="browser-detail" title={event.user_agent || "Browser unavailable"}>{browserLabel(event.user_agent)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="admin-empty">No selected-photo sharing events recorded yet.</p>) : <p className="admin-empty">Photo sharing audit storage is not configured yet. Apply the selected-photo tracking migrations, then refresh.</p>}
    </section>
  </main>;
}
