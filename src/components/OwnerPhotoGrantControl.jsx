import { Check, Copy, Link2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function OwnerPhotoGrantControl({ listing }) {
  const [admin, setAdmin] = useState(false);
  const [state, setState] = useState({ loading: false, error: "", grant: null, copied: false });

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      redirect: "manual",
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active) setAdmin(payload?.authenticated === true); })
      .catch(() => { if (active) setAdmin(false); });
    return () => { active = false; };
  }, []);

  if (!admin) return null;

  const generate = async () => {
    setState({ loading: true, error: "", grant: null, copied: false });
    try {
      const response = await fetch("/api/admin/photo-grants", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ code: listing.code }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Could not generate the link.");
      setState({ loading: false, error: "", grant: payload, copied: false });
    } catch (error) {
      setState({ loading: false, error: error.message || "Could not generate the link.", grant: null, copied: false });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.grant.url);
      setState((current) => ({ ...current, copied: true }));
      window.setTimeout(() => setState((current) => ({ ...current, copied: false })), 1800);
    } catch {
      setState((current) => ({ ...current, error: "Copy failed. Select and copy the link manually." }));
    }
  };

  return <section className="owner-photo-grant" aria-label="Owner photo download tools">
    <span className="eyebrow">Owner tools</span>
    <button className="button tertiary" type="button" onClick={generate} disabled={state.loading}>
      {state.loading ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}
      {state.loading ? "Generating…" : "Generate photo download link"}
    </button>
    {state.grant ? <div className="owner-grant-result">
      <label htmlFor={`grant-${listing.code}`}>Expires in 6 hours</label>
      <div><input id={`grant-${listing.code}`} value={state.grant.url} readOnly /><button type="button" onClick={copy} aria-label="Copy generated photo download link">{state.copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
    </div> : null}
    {state.error ? <p role="alert">{state.error}</p> : null}
  </section>;
}
