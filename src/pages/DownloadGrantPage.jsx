import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { normalizePhotoGrantStatus } from "../data/downloadGrantContract";

export function DownloadGrantPage() {
  const { grantToken = "" } = useParams();
  const [state, setState] = useState({ loading: true, grant: null, error: false });
  useEffect(() => {
    let active = true;
    fetch(`/api/photo-grants/${encodeURIComponent(grantToken)}`, { cache: "no-store", credentials: "include" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => {
        if (!normalizePhotoGrantStatus(payload, grantToken)) throw new Error("unavailable");
        return fetch("/api/photo-grants/activate", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ token: grantToken }),
        });
      })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => active && setState({ loading: false, grant: payload, error: false }))
      .catch(() => active && setState({ loading: false, grant: null, error: true }));
    return () => { active = false; };
  }, [grantToken]);

  if (state.loading) return <main className="page-width page-state"><strong>Checking download link…</strong></main>;
  if (!state.grant) return <main className="page-width page-state"><strong>Download access unavailable</strong><p>This private link is invalid, expired, or no longer available for this recipient.</p><Link className="button secondary" to="/"><ArrowLeft size={18} /> Back to Catalogue</Link></main>;

  const grant = state.grant;
  return <main className="page-width download-grant-page">
    <section className="download-grant-card">
      <span className="download-grant-icon"><CheckCircle2 size={30} /></span>
      <span className="eyebrow">Catalogue photo access enabled</span>
      <h1>Browse listings to download photos</h1>
      <p className="download-grant-code">You can now open any published SMI page and download all of that listing’s sanitized, watermarked photos.</p>
      <Link className="button primary" to="/"><ArrowLeft size={18} /> Browse Catalogue</Link>
      <div className="download-grant-warning"><ShieldAlert size={18} /><p>This access expires at {new Date(grant.expiresAt).toLocaleString("en-MY")}. Download controls appear only on individual property pages while this access is active.</p></div>
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to Catalogue</Link>
    </section>
  </main>;
}
