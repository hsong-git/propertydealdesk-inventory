import { Eye, LoaderCircle, MailOpen, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Seo } from "../components/Seo";
import { formatRoomSummary } from "../data/requirementContract";
import { formatDateTime, formatPrice } from "../utils/listing";

const request = async (url, options) => {
  const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json", ...(options?.body ? { "content-type": "application/json" } : {}) }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
};

const detailLabels = {
  propertyType: "Property Type", storeys: "Number of Storeys", area: "Area / Location", budget: "Budget", bedrooms: "Bedrooms", bathrooms: "Bathrooms",
  relationship: "Relationship", otherNeeds: "Other Needs", moveInDate: "Move-in Date", peopleStaying: "People Staying",
  pet: "Pet", furnishing: "Furnishing", tenancy: "Tenancy", tenancyPeriod: "Tenancy Period", depositAgreement: "Deposits and Fees",
  purchaseTimeline: "Purchase Timeline", purpose: "Purpose", loan: "Loan", occupants: "Occupants",
};

const ADMIN_PAGE_SIZE = 100;

const loadAllSubmissions = async () => {
  const submissions = [];
  let offset = 0;
  while (true) {
    const payload = await request(`/api/admin/requirements?limit=${ADMIN_PAGE_SIZE}&offset=${offset}`);
    const page = Array.isArray(payload.submissions) ? payload.submissions : [];
    submissions.push(...page);
    if (page.length < ADMIN_PAGE_SIZE) return submissions;
    offset += page.length;
  }
};

export function RequirementsAdminPage() {
  const [state, setState] = useState({ loading: true, authenticated: false, submissions: [], error: "" });
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState("");
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const session = await request("/api/admin/session");
      if (session.authenticated !== true) throw new Error("Administrator access required.");
      const submissions = await loadAllSubmissions();
      setState({ loading: false, authenticated: true, submissions, error: "" });
    } catch (error) {
      setState({ loading: false, authenticated: false, submissions: [], error: error.message });
    }
  };
  useEffect(() => { load(); }, []);

  const view = async (reference) => {
    setBusy(reference);
    try { setSelected((await request(`/api/admin/requirements/${reference}`)).submission); }
    catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setBusy(""); }
  };
  const markRead = async (reference) => {
    setBusy(reference);
    try {
      await request(`/api/admin/requirements/${reference}`, { method: "PATCH", body: JSON.stringify({ status: "read" }) });
      setState((current) => ({ ...current, submissions: current.submissions.map((item) => item.reference === reference ? { ...item, status: "read" } : item) }));
      setSelected((current) => current?.reference === reference ? { ...current, status: "read" } : current);
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setBusy(""); }
  };
  const remove = async (reference) => {
    if (!window.confirm(`Delete ${reference}? This cannot be undone.`)) return;
    setBusy(reference);
    try {
      await request(`/api/admin/requirements/${reference}`, { method: "DELETE" });
      setState((current) => ({ ...current, submissions: current.submissions.filter((item) => item.reference !== reference) }));
      if (selected?.reference === reference) setSelected(null);
    } catch (error) { setState((current) => ({ ...current, error: error.message })); }
    finally { setBusy(""); }
  };

  return (
    <main className="admin-requirements-page"><Seo title="Property Inquiries Admin" />
      <div className="page-width admin-requirements-shell">
        <header><span className="eyebrow">Protected administration</span><h1>Property Inquiries</h1><p>Read and delete submitted tenant and buyer enquiries. Production requires the configured administrator login; local access uses the local inquiries database.</p></header>
        {state.loading ? <div className="state-card"><LoaderCircle className="spin" /><strong>Checking administrator access…</strong></div> : null}
        {!state.loading && !state.authenticated ? <div className="state-card error"><strong>Administrator access required</strong><span>{state.error || "You are not authorized to view submissions."}</span></div> : null}
        {state.authenticated && state.error ? <div className="requirement-alert error">{state.error}</div> : null}
        {state.authenticated ? <section className="admin-table-card"><div className="admin-table-summary"><strong>{state.submissions.length}</strong><span>saved {state.submissions.length === 1 ? "inquiry" : "inquiries"}</span><button type="button" onClick={load} disabled={state.loading}>Refresh</button></div><div className="admin-table-wrap"><table><thead><tr><th>Reference Number</th><th>Submission Date</th><th>Rent / Buy</th><th>Name</th><th>Mobile Number</th><th>Area</th><th>Budget</th><th>Actions</th></tr></thead><tbody>{state.submissions.map((item) => <tr className={item.status === "unread" ? "unread" : ""} key={item.reference}><td><strong>{item.reference}</strong>{item.status === "unread" ? <small>New</small> : null}</td><td>{formatDateTime(item.submittedAt)}</td><td>{item.intent === "rent" ? "Rent" : "Buy"}</td><td>{item.name}</td><td>{item.mobile}</td><td>{item.area}</td><td>{formatPrice(item.budget, item.intent === "rent" ? "WTL" : "WTS")}</td><td><div className="admin-row-actions"><button type="button" title="Read inquiry" aria-label={`Read inquiry ${item.reference}`} onClick={() => view(item.reference)} disabled={busy === item.reference}><Eye size={16} /></button>{item.status === "unread" ? <button type="button" title="Mark as read" aria-label={`Mark ${item.reference} as read`} onClick={() => markRead(item.reference)} disabled={busy === item.reference}><MailOpen size={16} /></button> : null}<button className="danger" type="button" title="Delete inquiry" aria-label={`Delete inquiry ${item.reference}`} onClick={() => remove(item.reference)} disabled={busy === item.reference}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{!state.submissions.length ? <div className="admin-empty">No property inquiries have been submitted.</div> : null}</section> : null}
      </div>
      {selected ? <div className="admin-detail-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="admin-detail" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title" onMouseDown={(event) => event.stopPropagation()}><div className="admin-detail-heading"><div><span className="eyebrow">{selected.status === "unread" ? "Unread submission" : "Submission"}</span><h2 id="submission-detail-title">{selected.reference}</h2></div><button className="icon-button" type="button" onClick={() => setSelected(null)} aria-label="Close"><X /></button></div><dl className="admin-detail-list"><div><dt>Submitted</dt><dd>{formatDateTime(selected.submittedAt)}</dd></div><div><dt>Rent / Buy</dt><dd>{selected.intent === "rent" ? "Rent" : "Buy"}</dd></div>{Object.entries(selected.profile || {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{{ name: "Name", mobile: "Mobile Number", race: "Race", raceOther: "Race (Other)", country: "Country", occupation: "Occupation", companyName: "Company Name" }[key] || key}</dt><dd>{value}</dd></div>)}{Object.entries(selected.requirements || {}).filter(([, value]) => value !== "" && value !== null).map(([key, value]) => <div key={key}><dt>{detailLabels[key] || key}</dt><dd>{key === "budget" ? formatPrice(value, selected.intent === "rent" ? "WTL" : "WTS") : value}</dd></div>)}<div><dt>Room Summary</dt><dd>{formatRoomSummary(selected.requirements?.bedrooms, selected.requirements?.bathrooms)}</dd></div><div><dt>Consent recorded</dt><dd>{formatDateTime(selected.consentedAt)}</dd></div></dl><div className="admin-detail-actions">{selected.status === "unread" ? <button className="button secondary" type="button" onClick={() => markRead(selected.reference)}><MailOpen size={16} /> Mark as Read</button> : null}<button className="button secondary danger" type="button" onClick={() => remove(selected.reference)}><Trash2 size={16} /> Delete</button></div></section></div> : null}
    </main>
  );
}
