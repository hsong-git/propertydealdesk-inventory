import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { normalizePhotoGrantStatus } from "../data/downloadGrantContract";

export function DownloadGrantPage() {
  const { grantToken = "" } = useParams();
  const [state, setState] = useState({ loading: true, grant: null });
  useEffect(() => {
    let active = true;
    fetch(`/api/photo-grants/${encodeURIComponent(grantToken)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => active && setState({ loading: false, grant: normalizePhotoGrantStatus(payload, grantToken) }))
      .catch(() => active && setState({ loading: false, grant: null }));
    return () => { active = false; };
  }, [grantToken]);

  if (state.loading) return <main className="page-width page-state"><strong>Checking download link…</strong></main>;
  if (!state.grant) return <main className="page-width page-state"><strong>Download unavailable</strong><p>This private link is invalid, expired, or no longer published.</p><Link className="button secondary" to="/"><ArrowLeft size={18} /> Back to Catalogue</Link></main>;

  const grant = state.grant;
  return <main className="page-width download-grant-page">
    <section className="download-grant-card">
      <span className="download-grant-icon"><Download size={30} /></span>
      <span className="eyebrow">Owner-authorized image package</span>
      <h1>{grant.title}</h1>
      <p className="download-grant-code">Listing {grant.code}</p>
      <a className="button primary" href={grant.downloadPath} download><Download size={18} /> Download sanitized photos</a>
      <div className="download-grant-warning"><ShieldAlert size={18} /><p>This private link expires at {new Date(grant.expiresAt).toLocaleString("en-MY")}. Anyone who receives it can download the package until expiry.</p></div>
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to Catalogue</Link>
    </section>
  </main>;
}
