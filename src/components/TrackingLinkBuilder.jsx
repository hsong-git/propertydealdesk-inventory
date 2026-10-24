import { useState } from "react";
import { campaignUrl } from "../utils/trafficAttribution";

export function TrackingLinkBuilder({ host }) {
  const [destination, setDestination] = useState(`https://${host}/`);
  const [source, setSource] = useState("whatsapp");
  const [campaign, setCampaign] = useState("property_listings");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const medium = { whatsapp: "messaging", telegram: "messaging", email: "email", facebook: "social", instagram: "social", tiktok: "social" }[source] || "tagged_link";
  let url = "", validation = "";
  try { url = campaignUrl(destination, { source, medium, campaign, content }); } catch (e) { validation = e.message; }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setError(""); } catch { setError("Copy the generated link from the field below."); }
  };
  return <section className="analytics-card tracking-link-builder">
    <h2>Create a tracked link</h2>
    <p className="analytics-table-note">Use a different campaign or placement for each group, post or email. Use labels, without names, phone numbers or email addresses.</p>
    <div className="tracking-link-fields" onChange={() => { setCopied(false); setError(""); }}>
      <label>Destination link<input type="url" value={destination} onChange={(event) => setDestination(event.target.value)} /></label>
      <label>Source<select value={source} onChange={(event) => setSource(event.target.value)}>{["whatsapp", "facebook", "instagram", "telegram", "email", "tiktok"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Campaign<input value={campaign} maxLength={64} onChange={(event) => setCampaign(event.target.value)} placeholder="october_rentals" /></label>
      <label>Placement / group label (optional)<input value={content} maxLength={64} onChange={(event) => setContent(event.target.value)} placeholder="klang_agents_group" /></label>
    </div>
    {validation ? <p className="form-error" role="status">{validation}</p> : <label>Tracked link<input readOnly value={url} onFocus={(event) => event.target.select()} /></label>}
    <button type="button" className="button secondary" disabled={!url} onClick={copy}>{copied ? "Copied" : "Copy tracked link"}</button>
    {error ? <p role="status">{error}</p> : null}
  </section>;
}
