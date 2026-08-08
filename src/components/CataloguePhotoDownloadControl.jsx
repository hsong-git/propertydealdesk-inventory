import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export function CataloguePhotoDownloadControl({ listing }) {
  const [state, setState] = useState({ loading: true, available: false, expiresAt: "" });

  useEffect(() => {
    let active = true;
    fetch(`/api/catalogue-photo-grants/${encodeURIComponent(listing.code)}`, {
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json" },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        setState({ loading: false, available: payload?.available === true, expiresAt: payload?.expiresAt || "" });
      })
      .catch(() => active && setState({ loading: false, available: false, expiresAt: "" }));
    return () => { active = false; };
  }, [listing.code]);

  if (state.loading || !state.available) return null;
  return <section className="recipient-photo-download" aria-label="Authorized photo download">
    <span className="eyebrow">Authorized catalogue access</span>
    <a className="button tertiary" href={`/api/catalogue-photo-download/${encodeURIComponent(listing.code)}`} download>
      <Download size={18} /> Download all photos for {listing.code}
    </a>
    <small>Available until {new Date(state.expiresAt).toLocaleString("en-MY")}</small>
  </section>;
}
