import { useSiteLanguage } from "./InquiryLanguage";
import { Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice, intentLabels } from "../utils/listing";
import { PublicPropertyImage } from "./PublicPropertyImage";
import { InventoryBadge } from "./InventoryBadge";

function RelatedListingCard({ listing }) {
  const { t: tSite } = useSiteLanguage();
  return (
    <article className="related-listing-card">
      <Link className="related-listing-photo" to={`/property/${listing.slug}`} aria-label={tSite(`View ${listing.title}`)}>
        {tSite(listing.photos[0]
          ? <PublicPropertyImage className={listing.adPage ? "is-ad-page" : ""} src={listing.photos[0]} alt={tSite(`${listing.title} in ${listing.location}`)} loading="lazy" />
          : <span className="property-photo-placeholder"><Building2 size={28} /><small>{tSite("Photo coming soon")}</small></span>)}
      </Link>
      <div className="related-listing-copy">
        <div className="property-reference"><span className="property-code"><InventoryBadge listing={listing} />{tSite(listing.displayCode || listing.code)}</span><span className={`intent intent-${listing.intent.toLowerCase()}`}>{tSite(listing.intent)}<small>{tSite(intentLabels[listing.intent])}</small></span></div>
        <h3><Link to={`/property/${listing.slug}`}>{tSite(listing.title)}</Link></h3>
        <p className="property-location"><MapPin size={14} /> {tSite(listing.location)}</p>
        <strong>{tSite(formatPrice(listing.price, listing.intent))}</strong>
        <Link className="button secondary" to={`/property/${listing.slug}`}>{tSite("View details")}</Link>
      </div>
    </article>
  );
}

export function RelatedListings({ listings }) {
  const { t: tSite } = useSiteLanguage();
  if (!listings.length) return null;
  return (
    <section className="related-listings" aria-labelledby="related-listings-heading">
      <div className="related-listings-heading">
        <span className="eyebrow">{tSite("More public inventory")}</span>
        <h2 id="related-listings-heading">{tSite("Related listings you may want to compare")}</h2>
      </div>
      <div className="related-listing-grid">
        {tSite(listings.map((listing) => <RelatedListingCard key={listing.publicId || listing.code} listing={listing} />))}
      </div>
    </section>
  );
}
