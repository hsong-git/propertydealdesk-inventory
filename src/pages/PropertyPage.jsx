import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Compass, Copy, Expand, ImageOff, MapPin, Maximize2, MessageCircle, Phone, Share2, Sofa, Warehouse, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { useInventory } from "../hooks";
import { enquiryText, formatDate, formatPrice, intentLabels, postingText, shareListing } from "../utils/listing";
import { openWhatsApp } from "../utils/whatsapp";
import { PublicPropertyImage } from "../components/PublicPropertyImage";
import { PhotoDownloadButton } from "../components/PhotoDownloadButton";
import { Seo } from "../components/Seo";
import { ListingUnavailableState } from "../components/ListingUnavailableState";
import { propertySeoDescription, SITE_ORIGIN } from "../utils/seo";
import { photoSwipeDirection } from "../utils/photoSwipe";
import { getRelatedListings } from "../utils/relatedListings";
import { RelatedListings } from "../components/RelatedListings";

const photoDownloadsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PHOTO_DOWNLOADS === "true";

export function PropertyPage() {
  const { slug } = useParams();
  const { items, locationDictionary, loading, error } = useInventory();
  const listing = items.find((item) => item.slug === slug);
  const [activePhoto, setActivePhoto] = useState(0);
  const [copied, setCopied] = useState(false);
  const [postingCopied, setPostingCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlide, setLightboxSlide] = useState("");
  const swipeStart = useRef(null);
  const seoTitle = listing ? `${listing.title} | ${listing.code} | HS Ong Property Inventory` : "Property Details | HS Ong Property Inventory";
  const seoDescription = listing ? propertySeoDescription(listing, formatPrice(listing.price, listing.intent)) : "Public property details from HS Ong Property Inventory.";
  const seoCanonical = `${SITE_ORIGIN}/property/${slug}`;
  function movePhoto(direction) {
    if (!listing?.photos.length) return;
    setLightboxSlide(direction > 0 ? "next" : "previous");
    setActivePhoto((current) => (current + direction + listing.photos.length) % listing.photos.length);
  }
  useEffect(() => { window.scrollTo(0, 0); setActivePhoto(0); setLightboxSlide(""); }, [slug]);
  useEffect(() => {
    if (!lightboxOpen) return undefined;
    document.body.classList.add("modal-open");
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", onKeyDown); };
  }, [lightboxOpen, listing?.photos.length]);
  if (loading) return <main className="page-width page-state"><Seo title="Loading property details | HS Ong Property Inventory" canonical={seoCanonical} /><strong>Loading property details…</strong></main>;
  if (error || !listing) return <><Seo title="Property no longer available | HS Ong Property Inventory" description="This property may have been sold, rented, withdrawn, or removed from HS Ong Property Inventory." canonical={seoCanonical} /><ListingUnavailableState code={slug} error={error} /></>;
  const detailItems = [
    [Building2, "Property type", listing.propertyType], [BedDouble, "Bedrooms", listing.bedrooms ?? "N/A"], [Bath, "Bathrooms", listing.bathrooms ?? "N/A"],
    [Expand, "Built-up", listing.builtUpSqFt ? `${listing.builtUpSqFt.toLocaleString()} sq ft` : "N/A"], [Warehouse, "Land size", listing.landSize || "N/A"],
    [Sofa, "Furnishing", listing.furnishing], [Compass, "Facing", listing.facing || "N/A"], [Building2, "Unit type", listing.unitType || "N/A"],
  ];
  const onShare = async () => {
    try { if (await shareListing(listing) === "copied") { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } } catch { /* cancelled */ }
  };
  const onCopyPosting = async () => {
    await navigator.clipboard.writeText(postingText(listing, agentProfile));
    setPostingCopied(true);
    window.setTimeout(() => setPostingCopied(false), 1800);
  };
  const relatedListings = getRelatedListings(listing, items, 8, locationDictionary);
  const onLightboxTouchStart = (event) => {
    const touch = event.changedTouches?.[0];
    if (touch) swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onLightboxTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    const direction = photoSwipeDirection(swipeStart.current, touch && { x: touch.clientX, y: touch.clientY });
    swipeStart.current = null;
    if (direction && listing.photos.length > 1) movePhoto(direction);
  };
  return (
    <main className="page-width property-page">
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonical={seoCanonical}
        ogTitle={`${listing.title} | ${listing.code}`}
        ogDescription={seoDescription}
        image={listing.photos[0]}
        type="article"
      />
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to Catalogue</Link>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="gallery" aria-label="Property photos">
            <div className="gallery-main">{listing.photos[activePhoto]
              ? <button className="gallery-open" type="button" onClick={() => setLightboxOpen(true)} aria-label={`Open photo ${activePhoto + 1} of ${listing.photos.length} fullscreen`}><PublicPropertyImage src={listing.photos[activePhoto]} alt={`${listing.title} photo ${activePhoto + 1}`} /><span className="gallery-open-label"><Maximize2 size={17} /> Full view</span></button>
              : <span className="property-photo-placeholder detail-placeholder"><ImageOff size={38} /><small>No public photo supplied</small></span>}
              <span className={`intent intent-${listing.intent.toLowerCase()}`}>{listing.intent}<small>{intentLabels[listing.intent]}</small></span></div>
            {listing.photos.length > 1 ? <div className="gallery-thumbnails">{listing.photos.map((photo, index) => <button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)} key={photo}><PublicPropertyImage src={photo} alt={`View photo ${index + 1}`} /></button>)}</div> : null}
          </section>
          <section className="detail-title-block">
            <div className="property-reference"><span>{listing.code}</span><span className={`availability availability-${listing.availability.toLowerCase().replaceAll(" ", "-")}`}>{listing.availability}</span></div>
            <h1>{listing.title}</h1><p className="property-location"><MapPin size={17} /> {listing.location}</p><strong className="detail-price">{formatPrice(listing.price, listing.intent)}</strong>
          </section>
          <section className="detail-section"><h2>Property overview</h2><p>{listing.description}</p><div className="detail-facts">{detailItems.map(([Icon, label, value]) => <div key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></div>)}</div></section>
          {listing.features.length ? <section className="detail-section"><h2>Property features</h2><ul className="check-list">{listing.features.map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul></section> : null}
          <section className="detail-section posting-details"><div className="posting-heading"><div><span className="eyebrow">Ready to share</span><h2>Posting details</h2></div><button className="button primary" type="button" onClick={onCopyPosting}><Copy size={17} /> {postingCopied ? "Copied" : "Copy posting"}</button></div><pre>{postingText(listing, agentProfile)}</pre></section>
          <p className="updated-line"><CalendarDays size={16} /> {listing.listedAt ? "Listed" : "Recorded"} {formatDate(listing.listedAt || listing.createdAt)} · Details are subject to confirmation.</p>
        </div>
        <aside className="agent-contact-card">
          <img src={agentProfile.portrait} alt={agentProfile.displayName} /><div><span className="eyebrow">Enquire directly</span><h2>{agentProfile.displayName}</h2><p>{agentProfile.title}</p><small>{agentProfile.agency}</small></div>
          <button className="button primary" type="button" onClick={() => openWhatsApp({ phone: agentProfile.whatsapp, message: enquiryText(listing, agentProfile.displayName), onError: (error) => window.alert(error) })}><MessageCircle size={18} /> WhatsApp enquiry</button>
          {photoDownloadsEnabled ? <PhotoDownloadButton listing={listing} /> : null}
          <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call {agentProfile.phoneDisplay}</a>
          <button className="button tertiary" type="button" onClick={onShare}><Share2 size={18} /> {copied ? "Link copied" : "Share property"}</button>
        </aside>
      </div>
      <RelatedListings listings={relatedListings} />
      {lightboxOpen ? <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${listing.title} photo viewer`}><button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="Close full photo view" autoFocus><X size={24} /></button>{listing.photos.length > 1 ? <button className="lightbox-arrow previous" type="button" onClick={() => movePhoto(-1)} aria-label="Previous photo"><ChevronLeft size={32} /></button> : null}<div className={`lightbox-image${lightboxSlide ? ` slide-${lightboxSlide}` : ""}`} onTouchStart={onLightboxTouchStart} onTouchEnd={onLightboxTouchEnd} onTouchCancel={() => { swipeStart.current = null; }} onAnimationEnd={() => setLightboxSlide("")}><PublicPropertyImage key={listing.photos[activePhoto]} src={listing.photos[activePhoto]} alt={`${listing.title} photo ${activePhoto + 1} fullscreen`} /><span className="lightbox-counter">{activePhoto + 1} / {listing.photos.length}</span></div>{listing.photos.length > 1 ? <button className="lightbox-arrow next" type="button" onClick={() => movePhoto(1)} aria-label="Next photo"><ChevronRight size={32} /></button> : null}</div> : null}
    </main>
  );
}
