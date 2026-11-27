import { useSiteLanguage } from "./InquiryLanguage";
import { BedDouble, Building2, CalendarDays, Copy, Expand, MapPin, MessageCircle, Share2, LayoutTemplate, Video } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { PublicPropertyImage } from "./PublicPropertyImage";
import { InventoryBadge } from "./InventoryBadge";
import { enquiryText, formatDate, formatPrice, intentLabels, postingText, shareListing, whatsappUrl, tenantEligibilitySummary, tenantEligibilityDescription, tenantEligibilityTone } from "../utils/listing";
import { formatRoomSummary } from "../data/requirementContract";
import { listingMediaLinks } from "../utils/listingMedia";
import { trackEvent } from "../utils/analytics";
import { SavePropertyButton } from "./Shortlist";

export function PropertyCard({ listing, viewOnly = false, displayIntent = "", isNew = false }) {
  const { t: tSite } = useSiteLanguage();
  const [shared, setShared] = useState(false);
  const [postingCopied, setPostingCopied] = useState(false);
  const showingAlternateOffer = displayIntent && listing.alternateIntent === displayIntent;
  const displayedIntent = showingAlternateOffer ? listing.alternateIntent : listing.intent;
  const displayedPrice = showingAlternateOffer ? listing.alternatePrice : listing.price;
  const otherIntent = showingAlternateOffer ? listing.intent : listing.alternateIntent;
  const otherPrice = showingAlternateOffer ? listing.price : listing.alternatePrice;
  const propertyHref = `/property/${listing.slug}${displayIntent ? `?intent=${encodeURIComponent(displayIntent)}` : ""}`;
  const share = async () => {
    try {
      const result = await shareListing(listing);
      trackEvent("share_property", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "card" } });
      if (result === "copied") {
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch { /* Visitor cancelled the native share sheet. */ }
  };
  const copyPosting = async () => {
    await navigator.clipboard.writeText(postingText(listing, agentProfile));
    trackEvent("copy_posting", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "card" } });
    setPostingCopied(true);
    window.setTimeout(() => setPostingCopied(false), 1800);
  };
  return (
    <article className="property-card">
      <Link className="property-photo" to={propertyHref} onClick={() => trackEvent("listing_open", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "photo" } })} aria-label={tSite(`View ${listing.title}`)}>
        {tSite(listing.photos[0]
          ? <PublicPropertyImage className={listing.adPage ? "is-ad-page" : ""} src={listing.photos[0]} alt={tSite(`${listing.title} in ${listing.location}`)} loading="lazy" />
          : <span className="property-photo-placeholder"><Building2 size={30} /><small>{tSite("Photo coming soon")}</small></span>)}
        {isNew ? <span className="new-badge">{tSite("New")}</span> : null}
      </Link>
      <div className="property-content">
        <div className="property-reference"><span className="property-reference-main"><span className="property-code"><InventoryBadge listing={listing} />{tSite(listing.displayCode || listing.code)}</span>{tSite(listingMediaLinks(listing, propertyHref).map((media) => <Link key={media.media} className={`property-media-pill property-media-pill-${media.media}`} to={media.href} aria-label={tSite(`View ${media.label.toLowerCase()} for ${listing.displayCode || listing.code}`)}>{tSite(media.media === "layout" ? <LayoutTemplate size={12} aria-hidden="true" /> : <Video size={12} aria-hidden="true" />)}{tSite(media.label)}</Link>))}</span><span className={`intent intent-${displayedIntent.toLowerCase()}`}>{tSite(displayedIntent)}<small>{tSite(intentLabels[displayedIntent])}</small></span></div>
        <h3><Link to={propertyHref} onClick={() => trackEvent("listing_open", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "title" } })}>{tSite(listing.title)}</Link></h3>
        <p className="property-location"><MapPin size={15} /> {tSite(listing.location)}</p>
        <div className="property-price-row">
          <strong className="property-price">{tSite(formatPrice(displayedPrice, displayedIntent))}</strong>
          <SavePropertyButton listing={listing} compact />
          <span className="copy-posting-control">
            {tSite(postingCopied ? <span className="copy-posting-prompt">{tSite("Copied")}</span> : null)}
            <button className="copy-posting-icon-button" type="button" onClick={copyPosting} aria-label={tSite(`Copy posting for ${listing.displayCode || listing.code}`)} title={tSite(postingCopied ? "Copied" : "Copy posting")}>
              <Copy size={16} />
            </button>
          </span>
        </div>
        {tSite(otherIntent && otherPrice != null ? <p className="property-alternate-offer">{tSite("Also available to ")}{tSite(otherIntent === "WTL" ? "rent" : "buy")}{tSite(": ")}<strong>{tSite(formatPrice(otherPrice, otherIntent))}</strong></p> : null)}
        <div className="property-facts">
          <span><Building2 size={16} /> {tSite(listing.propertyType)}</span>
          {tSite(listing.bedrooms != null || listing.bathrooms != null ? <span><BedDouble size={16} /> {tSite(formatRoomSummary(listing.bedrooms, listing.bathrooms))}</span> : null)}
          {tSite(listing.builtUpSqFt ? <span><Expand size={16} /> {tSite(listing.builtUpSqFt.toLocaleString())}{tSite(" sq ft")}</span> : null)}
        </div>
        <div className="property-meta"><span>{tSite(listing.furnishing)}</span><span><CalendarDays size={14} /> {tSite(listing.listedAt ? "Listed" : "Recorded")} {tSite(formatDate(listing.listedAt || listing.createdAt))}</span></div>
        {tSite(tenantEligibilitySummary(listing) ? <p className={`property-tenant-eligibility eligibility-${tenantEligibilityTone(listing)}`} title={tSite(tenantEligibilityDescription(listing))}><span>{tSite("Tenant eligibility:")}</span>{tSite(" ")}{tSite(tenantEligibilitySummary(listing))}</p> : null)}
      </div>
      <div className={`property-actions ${viewOnly ? "view-only" : ""}`}>
        <Link className="button secondary" to={propertyHref} onClick={() => trackEvent("listing_open", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "view_details" } })}>{tSite("View Details")}</Link>
        {tSite(viewOnly ? null : <a className="button primary icon-only-mobile" href={whatsappUrl(agentProfile.whatsapp, enquiryText(listing, agentProfile.displayName, { intent: displayedIntent }))} target="_blank" rel="noreferrer" onClick={() => trackEvent("whatsapp_click", { listingCode: listing.code, intent: displayedIntent, properties: { placement: "card" } })}><MessageCircle size={18} /><span>{tSite("Enquire")}</span></a>)}
        {tSite(viewOnly ? null : <button className="button tertiary share-button" type="button" onClick={share} aria-label={tSite(`Share ${listing.displayCode || listing.code}`)}><Share2 size={18} /><span>{tSite(shared ? "Copied" : "Share")}</span></button>)}
      </div>
    </article>
  );
}
