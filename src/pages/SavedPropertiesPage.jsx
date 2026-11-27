import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useInventory } from "../hooks";
import { useShortlist } from "../components/Shortlist";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { useInquiryLanguage } from "../components/InquiryLanguage";
import { resolveShortlist, shortlistMessage } from "../utils/shortlist.js";
import { postingFootnoteOrigin } from "../utils/listing.js";
import { openWhatsApp } from "../utils/whatsapp.js";
import { agentProfile } from "../config/agentProfile.js";
import { trackEvent } from "../utils/analytics.js";

export function SavedPropertiesPage() {
  const { t } = useInquiryLanguage(); const { keys, remove, persistent } = useShortlist();
  const { items, loading, error } = useInventory(); const [status, setStatus] = useState("");
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // Only resolve entries in this site's approved catalogue, never hidden inventory.
  const entries = resolveShortlist(keys, items); const available = entries.filter(entry => entry.listing).map(entry => entry.listing);
  const send = () => {
    if (!available.length) return;
    trackEvent("shortlist_whatsapp", { properties: { listing_count: available.length } });
    openWhatsApp({ phone: agentProfile.whatsapp, message: shortlistMessage(available, t, postingFootnoteOrigin()), onError: () => setStatus("Unable to open WhatsApp. Please contact HS Ong directly.") });
  };
  return <main className="page-width home-stack saved-properties-page"><Seo title="Saved properties | HS Ong" robots="noindex, follow" />
    <header><h1>{t("Saved properties")} ({keys.length})</h1><p>{t("Saved in this browser only. Lists on WWW and Property are separate and do not sync between devices.")}</p>{!persistent ? <p role="status">{t("Browser storage is blocked. Your shortlist will last only while this page is open.")}</p> : null}</header>
    {loading ? <p role="status">{t("Loading public inventory…")}</p> : error ? <p role="alert">{t("Unable to load saved properties. Please refresh.")}</p> : <>
    {available.length ? <button className="button primary shortlist-send" type="button" onClick={send}>{t("Enquire about shortlist on WhatsApp")} ({available.length})</button> : null}
    {available.length ? <div className="property-grid">{available.map(listing => <PropertyCard listing={listing} key={listing.publicId} />)}</div> : <p>{t("No available saved properties yet.")}</p>}
    {entries.filter(entry => !entry.listing).map(entry => <div className="saved-unavailable" key={entry.key}><span>{entry.key} · {t("No longer in this catalogue")}</span><button className="button secondary" type="button" onClick={() => remove(entry.key)}>{t("Remove")}</button></div>)}
    </>}{status ? <p role="status">{t(status)}</p> : null}<Link className="button secondary" to="/">{t("Back to Catalogue")}</Link>
  </main>;
}
