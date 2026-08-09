import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OwnerPhotoGrantControl } from "../components/OwnerPhotoGrantControl";
import { Seo } from "../components/Seo";

export function PhotoGrantsAdminPage() {
  const [state, setState] = useState({ loading: true, authenticated: false });

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin", headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setState({ loading: false, authenticated: payload?.authenticated === true }); })
      .catch(() => { if (active) setState({ loading: false, authenticated: false }); });
    return () => { active = false; };
  }, []);

  if (state.loading) return <main className="page-width page-state"><Seo title="Admin photo access | HS Ong Property Inventory" /><strong>Checking administrator access…</strong></main>;
  if (!state.authenticated) return <main className="page-width page-state"><Seo title="Administrator access required | HS Ong Property Inventory" /><strong>Administrator access required</strong><p>This page is only available to the catalogue owner.</p><Link className="button secondary" to="/">Back to Catalogue</Link></main>;

  return <main className="page-width admin-photo-grants-page">
    <Seo title="Photo access administration | HS Ong Property Inventory" description="Owner-only catalogue photo access administration." />
    <header className="admin-page-heading"><span className="eyebrow"><ShieldCheck size={15} /> Protected administration</span><h1>Catalogue photo access</h1><p>Grant a recipient access to download watermarked photos from individual SMI pages. Grants cover the catalogue, expire after 24 hours, and become active for one hour after first use.</p></header>
    <section className="admin-photo-grants-card"><OwnerPhotoGrantControl /></section>
    <Link className="back-link" to="/#properties">Back to Catalogue</Link>
  </main>;
}
