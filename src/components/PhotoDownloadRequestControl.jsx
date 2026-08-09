import { Check, Download, LoaderCircle, X } from "lucide-react";
import { useState } from "react";

export function PhotoDownloadRequestControl({ listing }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ name: "", phone: "", loading: false, sent: false, error: "" });
  const submit = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch("/api/photo-download-requests", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ code: listing.code, slug: listing.slug, title: listing.title, name: state.name, phone: state.phone }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not send request.");
      setState((current) => ({ ...current, loading: false, sent: true }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message || "Could not send request." })); }
  };
  return <>
    <button className="button secondary" type="button" onClick={() => { setOpen(true); setState({ name: "", phone: "", loading: false, sent: false, error: "" }); }}><Download size={18} /> PM for photos</button>
    {open ? <div className="photo-request-backdrop" role="dialog" aria-modal="true" aria-label="Request photos download" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="photo-request-modal"><button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>{state.sent ? <div className="photo-request-success"><Check size={28} /><h2>Request sent to HS Ong</h2><p>Your request for {listing.code} has been received. HS Ong will contact you if access is granted.</p><button className="button primary" type="button" onClick={() => setOpen(false)}>Done</button></div> : <form onSubmit={submit}><span className="eyebrow">Photo download request</span><h2>{listing.code}</h2><p>Enter your name and contact number so HS Ong can review this SMI photo request.</p><label>Name<input required value={state.name} onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))} autoComplete="name" /></label><label>Contact number<input required value={state.phone} onChange={(event) => setState((current) => ({ ...current, phone: event.target.value }))} autoComplete="tel" /></label>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button primary" type="submit" disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}{state.loading ? "Sending…" : "Send request"}</button></form>}</div></div> : null}
  </>;
}
