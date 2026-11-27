import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";
import { AdminBackLink } from "../components/AdminBackLink";
import { anonymousBrowserLabel } from "../utils/anonymousBrowser";
import { groupPhotoAudit } from "../utils/photoAudit";

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
  const [sort, setSort] = useState("latest");
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
  const groups = groupPhotoAudit(state.events, sort);
  const browserCount = groups.filter((group) => group.browserId).length;
  return <main className="page-width admin-downloads-page">
    <Seo title="Photo sharing audit | HS Ong Property Inventory" />
    <header className="admin-page-heading"><AdminBackLink /><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Photo sharing audit</h1><p>Grouped by browser. Expand a group to see its downloads and share attempts. Browser IDs identify browsers, not people.</p></header>
    <section className="admin-photo-audit-card">
      <div className="admin-table-summary photo-audit-toolbar"><strong>{state.events.length}</strong><span>events · {browserCount} browser IDs · latest 500 events</span><label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Latest activity first</option><option value="oldest">Oldest activity first</option><option value="events">Most events</option><option value="photos">Most photos</option><option value="browser">Browser ID (A–Z)</option></select></label><button type="button" onClick={() => load()}><RefreshCw size={15} /> Refresh</button>{testEntryCount ? <button className="button danger" type="button" onClick={removeTestEntries}><Trash2 size={15} /> Remove my test entries ({testEntryCount})</button> : null}</div>
      {state.available ? (groups.length ? <div className="photo-audit-groups">{groups.map((group) => <details className="photo-audit-group" key={group.key}>
        <summary><strong>{group.browserId ? anonymousBrowserLabel(group.browserId) : "Browser ID not recorded"}</strong><span>{group.count} events · {group.photoCount} photos · {group.listingCount} listings</span><span className="photo-audit-latest">Latest: {new Date(group.latest).toLocaleString("en-MY")}</span></summary>
        {!group.browserId ? <p className="photo-audit-note">These older entries have no browser ID and may belong to different browsers.</p> : null}
        <div className="photo-audit-table-wrap"><table className="photo-audit-table">
        <thead><tr><th>SMI</th><th>Photos</th><th>Method</th><th>Name</th><th>Email</th><th>Contact No.</th><th>Downloaded / shared at</th><th>Browser</th></tr></thead>
        <tbody>{group.events.map((event) => <tr key={event.id}>
          <td><a href={`/i/${encodeURIComponent(String(event.listing_code || "").toUpperCase())}`}><strong>{event.listing_code}</strong></a></td><td>{event.photo_count}</td><td>{shareMethodLabel(event.share_client)}</td><td>{event.name}</td>
          <td>{event.email}</td><td>{event.contact_number || "—"}</td><td>{new Date(event.shared_at).toLocaleString("en-MY")}</td><td className="browser-detail" title={event.user_agent || "Browser unavailable"}>{browserLabel(event.user_agent)}</td>
        </tr>)}</tbody>
      </table></div></details>)}</div> : <p className="admin-empty">No selected-photo sharing events recorded yet.</p>) : <p className="admin-empty">Photo sharing audit storage is not configured yet. Apply the selected-photo tracking migrations, then refresh.</p>}
    </section>
  </main>;
}
