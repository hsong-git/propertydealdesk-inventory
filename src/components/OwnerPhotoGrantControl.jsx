import { Check, Copy, Link2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function OwnerPhotoGrantControl({ listing }) {
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
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

  const revoke = async () => {
    if (!state.grant?.id) return;
    try {
      const response = await fetch(`/api/admin/photo-grants/${encodeURIComponent(state.grant.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { origin: window.location.origin, accept: "application/json" },
      });
      if (!response.ok) throw new Error("Could not revoke the grant.");
      setState({ loading: false, error: "Grant revoked.", grant: null, copied: false });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Could not revoke the grant." }));
    }
  };

  return <section className="owner-photo-grant" aria-label="Owner catalogue photo download tools">
    <span className="eyebrow">Owner tools</span>
    <label htmlFor={`grant-email-${listing.code}`}>Recipient email</label>
    <input id={`grant-email-${listing.code}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="agent@example.com" autoComplete="email" />
    <button className="button tertiary" type="button" onClick={generate} disabled={state.loading || !email.trim()}>
      {state.loading ? <LoaderCircle className="spin" size={18} /> : <Link2 size={18} />}
      {state.loading ? "Generating…" : "Grant catalogue photo access"}
    </button>
    {state.grant ? <div className="owner-grant-result">
      <label htmlFor={`grant-${listing.code}`}>Valid for 24 hours, then 1 hour after first access</label>
      <div><input id={`grant-${listing.code}`} value={state.grant.url} readOnly /><button type="button" onClick={copy} aria-label="Copy generated photo download link">{state.copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
      <button className="button secondary" type="button" onClick={revoke}>Revoke access</button>
    </div> : null}
    {state.error ? <p role="alert">{state.error}</p> : null}
  </section>;
}
