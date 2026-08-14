import { ArrowRight, ClipboardList, Images, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function AdminLandingPage() {
  const [state, setState] = useState({ loading: true, authenticated: false });
  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((payload) => setState({ loading: false, authenticated: payload.authenticated === true }))
      .catch(() => setState({ loading: false, authenticated: false }));
  }, []);
  if (state.loading) return <main className="page-width page-state"><LoaderCircle className="spin" /><strong>Checking administrator access…</strong></main>;
  if (!state.authenticated) return <main className="page-width page-state"><Seo title="Administrator access | HS Ong Property Inventory" /><a className="button primary" href="/cdn-cgi/access/login?redirect_url=%2Fadmin">Sign in with Cloudflare</a></main>;
  return <main className="admin-landing-page"><Seo title="Administration | HS Ong Property Inventory" /><div className="page-width admin-landing-shell"><header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Private administration</span><h1>Administration</h1><p>Choose an area to manage property enquiries or review selected-photo sharing activity.</p></header><section className="admin-tool-grid" aria-label="Administration tools"><Link className="admin-tool-card" to="/admin/inquiries/manage"><span className="admin-tool-icon"><ClipboardList size={24} /></span><span><strong>Property inquiries</strong><small>Read, copy, mark as read, and manage tenant and buyer enquiries.</small></span><ArrowRight size={19} /></Link><Link className="admin-tool-card" to="/admin/photo-downloads/audit"><span className="admin-tool-icon"><Images size={24} /></span><span><strong>Photo sharing audit</strong><small>Review who downloaded or shared selected SMI photos, including method and timestamp.</small></span><ArrowRight size={19} /></Link></section></div></main>;
}
