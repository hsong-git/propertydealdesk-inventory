import { RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function PhotoDownloadsAdminPage() {
  const [state, setState] = useState({ loading: true, allowed: false, events: [] });
  const load = async () => { setState((current) => ({ ...current, loading: true })); const response = await fetch("/api/admin/photo-downloads", { cache: "no-store", credentials: "same-origin" }); const payload = await response.json(); setState({ loading: false, allowed: response.ok, events: payload.events || [] }); };
  useEffect(() => { load().catch(() => setState({ loading: false, allowed: false, events: [] })); }, []);
  if (state.loading) return <main className="page-width page-state"><strong>Checking administrator access…</strong></main>;
  if (!state.allowed) return <main className="page-width page-state"><Seo title="Administrator access required | HS Ong Property Inventory" /><strong>Administrator access required</strong><p>This private audit page is not available to public visitors.</p><Link className="button secondary" to="/">Back to Catalogue</Link></main>;
  return <main className="page-width admin-downloads-page"><Seo title="Photo download audit | HS Ong Property Inventory" /><header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Photo download audit</h1><p>Every successful SMI ZIP download is recorded with the visitor identity, listing code and timestamp.</p></header><section className="admin-photo-audit-card"><div className="admin-table-summary"><strong>{state.events.length}</strong><span>download events</span><button type="button" onClick={() => load()}><RefreshCw size={15} /> Refresh</button></div>{state.events.length ? <div className="photo-audit-table-wrap"><table className="photo-audit-table"><thead><tr><th>SMI</th><th>Name</th><th>Email</th><th>Downloaded at</th><th>Browser</th></tr></thead><tbody>{state.events.map((event) => <tr key={event.id}><td><strong>{event.listing_code}</strong></td><td>{event.name}</td><td>{event.email}</td><td>{new Date(event.downloaded_at).toLocaleString("en-MY")}</td><td>{event.user_agent || "—"}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No downloads recorded yet.</p>}</section></main>;
}
