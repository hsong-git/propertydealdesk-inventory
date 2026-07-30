import { Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../utils/listing";
import { PublicPropertyImage } from "./PublicPropertyImage";

function RelatedListingCard({ listing }) {
  return (
    <article className="related-listing-card">
      <Link className="related-listing-photo" to={`/property/${listing.slug}`} aria-label={`View ${listing.title}`}>
        {listing.photos[0]
          ? <PublicPropertyImage src={listing.photos[0]} alt={`${listing.title} in ${listing.location}`} loading="lazy" />
          : <span className="property-photo-placeholder"><Building2 size={28} /><small>Photo coming soon</small></span>}
        <span className={`intent intent-${listing.intent.toLowerCase()}`}>{listing.intent}</span>
      </Link>
      <div className="related-listing-copy">
        <div className="property-reference"><span>{listing.code}</span></div>
        <h3><Link to={`/property/${listing.slug}`}>{listing.title}</Link></h3>
        <p className="property-location"><MapPin size={14} /> {listing.location}</p>
        <strong>{formatPrice(listing.price, listing.intent)}</strong>
        <Link className="button secondary" to={`/property/${listing.slug}`}>View details</Link>
      </div>
    </article>
  );
}

export function RelatedListings({ listings }) {
  if (!listings.length) return null;
  return (
    <section className="related-listings" aria-labelledby="related-listings-heading">
      <div className="related-listings-heading">
        <span className="eyebrow">More public inventory</span>
        <h2 id="related-listings-heading">Related listings you may want to compare</h2>
      </div>
      <div className="related-listing-grid">
        {listings.map((listing) => <RelatedListingCard key={listing.publicId || listing.code} listing={listing} />)}
      </div>
    </section>
  );
}
