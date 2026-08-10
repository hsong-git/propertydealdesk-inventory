import { RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

function browserLabel(userAgent) {
  const value = String(userAgent || "");
  const device = /Android|iPhone|iPad|Mobile/i.test(value) ? "Mobile" : "Desktop";
  const browser = /Edg\//i.test(value) ? "Edge" : /Firefox\//i.test(value) ? "Firefox" : /Chrome\//i.test(value) ? "Chrome" : /Safari\//i.test(value) ? "Safari" : "Browser";
  return `${device} · ${browser}`;
}

export function PhotoDownloadsAdminPage() {
  const [state, setState] = useState({ loading: true, allowed: false, available: true, events: [] });
  const load = async () => { setState((current) => ({ ...current, loading: true })); const response = await fetch("/api/admin/photo-downloads", { cache: "no-store", credentials: "same-origin" }); const payload = await response.json(); setState({ loading: false, allowed: response.status !== 401, available: response.ok, events: payload.events || [] }); };
  useEffect(() => { load().catch(() => setState({ loading: false, allowed: false, events: [] })); }, []);
  if (state.loading) return <main className="page-width page-state"><strong>Checking administrator access…</strong></main>;
  if (!state.allowed) return <main className="page-width page-state"><Seo title="Administrator access required | HS Ong Property Inventory" /><strong>Administrator access required</strong><p>This private audit page is not available to public visitors.</p><Link className="button secondary" to="/">Back to Catalogue</Link></main>;
  return <main className="page-width admin-downloads-page"><Seo title="Photo sharing audit | HS Ong Property Inventory" /><header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Photo sharing audit</h1><p>Selected-photo downloads and WhatsApp share attempts are recorded with visitor identity, SMI code and timestamp.</p></header><section className="admin-photo-audit-card"><div className="admin-table-summary"><strong>{state.events.length}</strong><span>photo sharing events</span><button type="button" onClick={() => load()}><RefreshCw size={15} /> Refresh</button></div>{state.available ? (state.events.length ? <div className="photo-audit-table-wrap"><table className="photo-audit-table"><thead><tr><th>SMI</th><th>Photos</th><th>Method</th><th>Name</th><th>Email</th><th>Contact No.</th><th>Shared at</th><th>Browser</th></tr></thead><tbody>{state.events.map((event) => <tr key={event.id}><td><a href={`/i/${encodeURIComponent(String(event.listing_code || "").toUpperCase())}`}><strong>{event.listing_code}</strong></a></td><td>{event.photo_count}</td><td>{event.share_client}</td><td>{event.name}</td><td>{event.email}</td><td>{event.contact_number || "—"}</td><td>{new Date(event.shared_at).toLocaleString("en-MY")}</td><td className="browser-detail" title={event.user_agent || "Browser unavailable"}>{browserLabel(event.user_agent)}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No selected-photo sharing events recorded yet.</p>) : <p className="admin-empty">Photo sharing audit storage is not configured yet. Apply the selected-photo tracking migration, then refresh.</p>}</section></main>;
}
