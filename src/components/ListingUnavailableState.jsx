import { ArrowLeft, MessageCircle, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { whatsappUrl } from "../utils/listing";

export function ListingUnavailableState({ code, error }) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const message = [
    `Hi ${agentProfile.displayName}, I opened ${normalizedCode ? `listing ${normalizedCode}` : "a property listing"} on your Property Inventory, but it appears to be no longer available.`,
    "Can you share any similar current listings?",
  ].join("\n");

  return (
    <main className="page-width page-state listing-unavailable-state">
      <div className="listing-unavailable-card">
        <span className="listing-unavailable-icon" aria-hidden="true"><SearchX size={28} /></span>
        <span className="eyebrow">Listing unavailable</span>
        <h1>This property is no longer available</h1>
        <p>
          {error || "This property may have been sold, rented, withdrawn, or removed from the public catalogue."}
        </p>
        <p className="listing-unavailable-note">
          You can browse the latest active listings or contact HS Ong for similar options.
        </p>
        <div className="listing-unavailable-actions">
          <Link className="button primary" to="/">
            <ArrowLeft size={18} /> Browse current listings
          </Link>
          <a className="button secondary" href={whatsappUrl(agentProfile.whatsapp, message)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={18} /> Contact HS Ong
          </a>
        </div>
      </div>
    </main>
  );
}
