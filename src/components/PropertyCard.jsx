import { BedDouble, Building2, CalendarDays, Copy, Expand, MapPin, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { PublicPropertyImage } from "./PublicPropertyImage";
import { enquiryText, formatDate, formatPrice, intentLabels, postingText, shareListing, whatsappUrl } from "../utils/listing";
import { formatRoomSummary } from "../data/requirementContract";

export function PropertyCard({ listing, viewOnly = false }) {
  const [shared, setShared] = useState(false);
  const [postingCopied, setPostingCopied] = useState(false);
  const share = async () => {
    try {
      const result = await shareListing(listing);
      if (result === "copied") {
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch { /* Visitor cancelled the native share sheet. */ }
  };
  const copyPosting = async () => {
    await navigator.clipboard.writeText(postingText(listing, agentProfile));
    setPostingCopied(true);
    window.setTimeout(() => setPostingCopied(false), 1800);
  };
  return (
    <article className="property-card">
      <Link className="property-photo" to={`/property/${listing.slug}`} aria-label={`View ${listing.title}`}>
        {listing.photos[0]
          ? <PublicPropertyImage src={listing.photos[0]} alt={`${listing.title} in ${listing.location}`} loading="lazy" />
          : <span className="property-photo-placeholder"><Building2 size={30} /><small>Photo coming soon</small></span>}
        <span className={`intent intent-${listing.intent.toLowerCase()}`}>{listing.intent}<small>{intentLabels[listing.intent]}</small></span>
        {listing.featured ? <span className="featured-badge">Featured</span> : null}
      </Link>
      <div className="property-content">
        <div className="property-reference"><span>{listing.code}</span><span className={`availability availability-${listing.availability.toLowerCase().replaceAll(" ", "-")}`}>{listing.availability}</span></div>
        <h3><Link to={`/property/${listing.slug}`}>{listing.title}</Link></h3>
        <p className="property-location"><MapPin size={15} /> {listing.location}</p>
        <div className="property-price-row">
          <strong className="property-price">{formatPrice(listing.price, listing.intent)}</strong>
          <span className="copy-posting-control">
            {postingCopied ? <span className="copy-posting-prompt">Copied</span> : null}
            <button className="copy-posting-icon-button" type="button" onClick={copyPosting} aria-label={`Copy posting for ${listing.code}`} title={postingCopied ? "Copied" : "Copy posting"}>
              <Copy size={16} />
            </button>
          </span>
        </div>
        <div className="property-facts">
          <span><Building2 size={16} /> {listing.propertyType}</span>
          {listing.bedrooms != null || listing.bathrooms != null ? <span><BedDouble size={16} /> {formatRoomSummary(listing.bedrooms, listing.bathrooms)}</span> : null}
          {listing.builtUpSqFt ? <span><Expand size={16} /> {listing.builtUpSqFt.toLocaleString()} sq ft</span> : null}
        </div>
        <div className="property-meta"><span>{listing.furnishing}</span><span><CalendarDays size={14} /> Updated {formatDate(listing.updatedAt)}</span></div>
      </div>
      <div className={`property-actions ${viewOnly ? "view-only" : ""}`}>
        <Link className="button secondary" to={`/property/${listing.slug}`}>View Details</Link>
        {viewOnly ? null : <a className="button primary icon-only-mobile" href={whatsappUrl(agentProfile.whatsapp, enquiryText(listing, agentProfile.displayName))} target="_blank" rel="noreferrer"><MessageCircle size={18} /><span>Enquire</span></a>}
        {viewOnly ? null : <button className="button tertiary share-button" type="button" onClick={share} aria-label={`Share ${listing.code}`}><Share2 size={18} /><span>{shared ? "Copied" : "Share"}</span></button>}
      </div>
    </article>
  );
}
