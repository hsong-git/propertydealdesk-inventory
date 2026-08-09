import { Check, Download, LoaderCircle, X } from "lucide-react";
import { useState } from "react";

export function PhotoDownloadButton({ listing }) {
  const [state, setState] = useState({ open: false, name: "", email: "", contactNumber: "", loading: false, error: "", sent: false });
  const download = async () => {
    const response = await fetch(`/api/photo-download/${encodeURIComponent(listing.code)}`, { credentials: "include", cache: "no-store" });
    if (response.ok) { window.location.href = `/api/photo-download/${encodeURIComponent(listing.code)}`; return; }
    setState((current) => ({ ...current, open: true, error: "" }));
  };
  const register = async (event) => {
    event.preventDefault(); setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch(`/api/photo-download/${encodeURIComponent(listing.code)}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: state.name, email: state.email, contactNumber: state.contactNumber }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Please enter a valid name and email.");
      setState((current) => ({ ...current, loading: false, sent: true }));
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error.message })); }
  };
  return <><button className="button secondary" type="button" onClick={download}><Download size={18} /> Download photos</button>{state.open ? <div className="photo-request-backdrop" role="dialog" aria-modal="true" aria-label="Register to download photos" onMouseDown={(event) => { if (event.target === event.currentTarget) setState((current) => ({ ...current, open: false })); }}><div className="photo-request-modal"><button className="modal-close" type="button" onClick={() => setState((current) => ({ ...current, open: false }))} aria-label="Close"><X size={20} /></button>{state.sent ? <div className="photo-request-success"><Check size={28} /><h2>Ready to download</h2><p>Your details are registered. Click below to download the watermarked photos for {listing.code}.</p><a className="button primary" href={`/api/photo-download/${encodeURIComponent(listing.code)}`} download><Download size={18} /> Download ZIP</a></div> : <form onSubmit={register}><span className="eyebrow">Photo download</span><h2>{listing.code}</h2><p>Enter your name, email and contact number once to download this SMI’s watermarked photos.</p><label>Name<input required value={state.name} onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))} autoComplete="name" /></label><label>Email<input required type="email" value={state.email} onChange={(event) => setState((current) => ({ ...current, email: event.target.value }))} autoComplete="email" /></label><label>Contact No.<input required type="tel" inputMode="tel" pattern="[+0-9 ()().-]{8,24}" placeholder="016-313 2865" value={state.contactNumber} onChange={(event) => setState((current) => ({ ...current, contactNumber: event.target.value }))} autoComplete="tel" /></label>{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<button className="button primary" type="submit" disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}{state.loading ? "Saving…" : "Continue to download"}</button></form>}</div></div> : null}</>;
}
