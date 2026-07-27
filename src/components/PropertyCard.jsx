import { Bath, BedDouble, Building2, CalendarDays, Expand, MapPin, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { PublicPropertyImage } from "./PublicPropertyImage";
import { enquiryText, formatDate, formatPrice, intentLabels, shareListing, whatsappUrl } from "../utils/listing";

export function PropertyCard({ listing }) {
  const [shared, setShared] = useState(false);
  const share = async () => {
    try {
      const result = await shareListing(listing);
      if (result === "copied") {
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch { /* Visitor cancelled the native share sheet. */ }
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
        <strong className="property-price">{formatPrice(listing.price, listing.intent)}</strong>
        <div className="property-facts">
          <span><Building2 size={16} /> {listing.propertyType}</span>
          {listing.bedrooms != null ? <span><BedDouble size={16} /> {listing.bedrooms} beds</span> : null}
          {listing.bathrooms != null ? <span><Bath size={16} /> {listing.bathrooms} baths</span> : null}
          {listing.builtUpSqFt ? <span><Expand size={16} /> {listing.builtUpSqFt.toLocaleString()} sq ft</span> : null}
        </div>
        <div className="property-meta"><span>{listing.furnishing}</span><span><CalendarDays size={14} /> Updated {formatDate(listing.updatedAt)}</span></div>
      </div>
      <div className="property-actions">
        <Link className="button secondary" to={`/property/${listing.slug}`}>View Details</Link>
        <a className="button primary icon-only-mobile" href={whatsappUrl(agentProfile.whatsapp, enquiryText(listing, agentProfile.displayName))} target="_blank" rel="noreferrer"><MessageCircle size={18} /><span>Enquire</span></a>
        <button className="button tertiary share-button" type="button" onClick={share} aria-label={`Share ${listing.code}`}><Share2 size={18} /><span>{shared ? "Copied" : "Share"}</span></button>
      </div>
    </article>
  );
}
