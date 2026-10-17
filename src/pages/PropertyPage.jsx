import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Compass, Copy, Expand, ImageOff, MapPin, Maximize2, MessageCircle, Phone, Share2, Sofa, Warehouse, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { useInventory } from "../hooks";
import { enquiryText, formatDate, formatPrice, intentLabels, postingText, shareListing, tenantEligibilityDescription } from "../utils/listing";
import { openWhatsApp } from "../utils/whatsapp";
import { PublicPropertyImage } from "../components/PublicPropertyImage";
import { ShareSelectedPhotosButton } from "../components/ShareSelectedPhotosButton";
import { Seo } from "../components/Seo";
import { ListingUnavailableState } from "../components/ListingUnavailableState";
import { propertyBreadcrumbs, propertyJsonLd, propertySeoDescription, SITE_ORIGIN } from "../utils/seo";
import { COMBINED_CATALOGUE } from "../config/catalogueSite.js";
import { photoSwipeDirection } from "../utils/photoSwipe";
import { getRelatedListings } from "../utils/relatedListings";
import { RelatedListings } from "../components/RelatedListings";
import { InventoryBadge } from "../components/InventoryBadge";
import { rememberListingView } from "../components/RecentViewingPill";
import { PHOTO_SELECTION_LIMIT } from "../utils/photoShare";
import { PortraitModal } from "../components/PortraitModal";
import { PropertyVideo } from "../components/PropertyVideo";
import { initialListingGallery } from "../utils/listingMedia";

const photoSharingEnabled = import.meta.env.VITE_ENABLE_PHOTO_SHARING !== "false";

export function PropertyPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { items, allItems, locationDictionary, loading, error } = useInventory();
  const listing = allItems.find((item) => item.slug === slug);
  const [activePhoto, setActivePhoto] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeGallery, setActiveGallery] = useState("photos");
  const galleryPhotos = activeGallery === "layout" ? (listing?.layouts || []) : (listing?.photos || []);
  const [copied, setCopied] = useState(false);
  const [postingCopied, setPostingCopied] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [agentPortraitOpen, setAgentPortraitOpen] = useState(false);
  const [lightboxSlide, setLightboxSlide] = useState("");
  const swipeStart = useRef(null);
  const requestedIntent = searchParams.get("intent")?.toUpperCase();
  const displayIntent = listing && [listing.intent, listing.alternateIntent].includes(requestedIntent) ? requestedIntent : listing?.intent;
  const displayPrice = displayIntent === listing?.alternateIntent ? listing?.alternatePrice : listing?.price;
  const otherIntent = displayIntent === listing?.alternateIntent ? listing?.intent : listing?.alternateIntent;
  const otherPrice = displayIntent === listing?.alternateIntent ? listing?.price : listing?.alternatePrice;
  const seoTitle = listing ? `${listing.title} | ${listing.displayCode || listing.code} | HS Ong Property Inventory` : "Property Details | HS Ong Property Inventory";
  const seoDescription = listing ? propertySeoDescription(listing, formatPrice(displayPrice, displayIntent)) : "Public property details from HS Ong Property Inventory.";
  const seoCanonical = `${SITE_ORIGIN}/property/${slug}`;
  function movePhoto(direction) {
    if (!galleryPhotos.length) return;
    setLightboxSlide(direction > 0 ? "next" : "previous");
    setActivePhoto((current) => (current + direction + galleryPhotos.length) % galleryPhotos.length);
  }
  const requestedMedia = searchParams.get("media");
  const hasLayouts = Boolean(listing?.layouts?.length);
  const firstVideo = listing?.videos?.[0];
  useEffect(() => {
    const gallery = initialListingGallery(listing, requestedMedia);
    window.scrollTo(0, 0);
    setActivePhoto(0);
    setActiveVideo(gallery === "videos" ? firstVideo : null);
    setActiveGallery(gallery);
    setSelectedPhotos([]);
    setLightboxSlide("");
  }, [slug, listing?.code, requestedMedia, hasLayouts, firstVideo]);
  useEffect(() => {
    if (!listing?.code) return;
    rememberListingView(listing.code);
    fetch("/api/listing-views", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: listing.code }) }).catch(() => {});
  }, [listing?.code]);
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
  }, [lightboxOpen, galleryPhotos.length]);
  if (loading) return <main className="page-width page-state"><Seo title="Loading property details | HS Ong Property Inventory" canonical={seoCanonical} /><strong>Loading property details…</strong></main>;
  if (error || !listing) return <><Seo title="Property no longer available | HS Ong Property Inventory" description="This property may have been sold, rented, withdrawn, or removed from HS Ong Property Inventory." canonical={seoCanonical} robots="noindex, follow" /><ListingUnavailableState code={slug} error={error} /></>;
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
  const relatedListings = getRelatedListings(listing, COMBINED_CATALOGUE ? allItems : items, 8, locationDictionary);
  const firstPhotoSelection = listing.photos.slice(0, PHOTO_SELECTION_LIMIT);
  const firstPhotosSelected = firstPhotoSelection.length > 0 && firstPhotoSelection.every((photo) => selectedPhotos.includes(photo));
  const selectFirstPhotos = () => setSelectedPhotos((current) => firstPhotosSelected ? current.filter((photo) => !firstPhotoSelection.includes(photo)) : firstPhotoSelection);
  const onLightboxTouchStart = (event) => {
    const touch = event.changedTouches?.[0];
    if (touch) swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onLightboxTouchEnd = (event) => {
    const touch = event.changedTouches?.[0];
    const direction = photoSwipeDirection(swipeStart.current, touch && { x: touch.clientX, y: touch.clientY });
    swipeStart.current = null;
    if (direction && galleryPhotos.length > 1) movePhoto(direction);
  };
  return (
    <main className="page-width property-page">
      <Seo
        title={seoTitle}
        robots={listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "noindex, nofollow" : "index, follow"}
        description={seoDescription}
        canonical={seoCanonical}
        ogTitle={`${listing.title} | ${listing.displayCode || listing.code}`}
        ogDescription={seoDescription}
        image={listing.photos[0]}
        type="article"
        structuredData={[propertyJsonLd(listing), propertyBreadcrumbs(listing)]}
      />
      <Link className="back-link" to={listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "/cmi" : "/"}><ArrowLeft size={17} /> {listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "Back to CMI Catalogue" : "Back to Catalogue"}</Link>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="gallery" aria-label="Property photos and videos">
            {activeVideo && listing.videos?.includes(activeVideo) ? <PropertyVideo src={activeVideo} title={listing.title} poster={listing.photos[0]} /> : null}
            <div hidden={activeVideo !== null && listing.videos?.includes(activeVideo)}>
            <div className={`gallery-main${activeGallery === "layout" ? " is-layout" : ""}`}>{galleryPhotos[activePhoto]
              ? <button className="gallery-open" type="button" onClick={() => setLightboxOpen(true)} aria-label={`Open ${activeGallery === "layout" ? "layout" : "photo"} ${activePhoto + 1} of ${galleryPhotos.length} fullscreen`}><PublicPropertyImage className={activeGallery === "photos" && galleryPhotos[activePhoto] === listing.adPage ? "is-ad-page" : ""} allowIndividualSave src={galleryPhotos[activePhoto]} alt={`${listing.title} ${activeGallery === "layout" ? "layout" : "photo"} ${activePhoto + 1}`} /><span className="gallery-open-label"><Maximize2 size={17} /> Full view</span></button>
              : <span className="property-photo-placeholder detail-placeholder"><ImageOff size={38} /><small>No public photo supplied</small></span>}
              {activeGallery === "photos" && galleryPhotos[activePhoto] === listing.adPage ? null : <span className={`intent intent-${displayIntent.toLowerCase()}`}>{displayIntent}<small>{intentLabels[displayIntent]}</small></span>}</div>
            </div>
            {listing.layouts?.length || listing.videos?.length ? <div className="gallery-video-controls" aria-label="Property media"><button type="button" className={activeGallery === "photos" ? "active" : ""} aria-pressed={activeGallery === "photos"} onClick={() => { setActiveGallery("photos"); setActivePhoto(0); setActiveVideo(null); }}>Photos</button>{listing.layouts?.length ? <button type="button" className={activeGallery === "layout" ? "active" : ""} aria-pressed={activeGallery === "layout"} onClick={() => { setActiveGallery("layout"); setActivePhoto(0); setActiveVideo(null); }}>Layout</button> : null}{listing.videos?.length ? <button type="button" className={activeGallery === "videos" ? "active" : ""} aria-pressed={activeGallery === "videos"} onClick={() => { setActiveGallery("videos"); setActiveVideo(listing.videos[0]); }}>Videos</button> : null}</div> : null}
            {activeGallery === "videos" && listing.videos?.length > 1 ? <div className="gallery-video-controls" aria-label="Choose video">{listing.videos.map((src, index) => <button type="button" key={src} className={activeVideo === src ? "active" : ""} aria-pressed={activeVideo === src} onClick={() => setActiveVideo(src)}>▶ Video {index + 1}</button>)}</div> : null}
            <div hidden={activeVideo !== null && listing.videos?.includes(activeVideo)}>
            {activeGallery === "photos" && photoSharingEnabled && galleryPhotos.length > 0 ? <><div className="gallery-thumbnails">{galleryPhotos.map((photo, index) => { const selected = selectedPhotos.includes(photo); const blocked = selectedPhotos.length >= PHOTO_SELECTION_LIMIT && !selected; return <div className="gallery-thumbnail-choice" key={photo}><button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)}><PublicPropertyImage allowIndividualSave src={photo} alt={`View photo ${index + 1}`} /></button><button type="button" disabled={blocked} className={`photo-select-toggle${selected ? " selected" : ""}${blocked ? " is-blocked" : ""}`} aria-label={`${selected ? "Deselect" : "Select"} photo ${index + 1}`} aria-pressed={selected} onClick={() => setSelectedPhotos((current) => selected ? current.filter((item) => item !== photo) : current.length < PHOTO_SELECTION_LIMIT ? [...current, photo] : current)}>{selected ? <Check size={14} /> : <span />}</button></div>; })}</div><button className="select-first-photos" type="button" onClick={selectFirstPhotos} disabled={!galleryPhotos.length} aria-pressed={firstPhotosSelected}>{firstPhotosSelected ? "Deselect first " : "Select first "}{Math.min(PHOTO_SELECTION_LIMIT, galleryPhotos.length)}</button><ShareSelectedPhotosButton listing={listing} selectedPhotos={selectedPhotos} /></> : galleryPhotos.length > 1 ? <div className="gallery-thumbnails">{galleryPhotos.map((photo, index) => <button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)} key={photo}><PublicPropertyImage allowIndividualSave src={photo} alt={`View photo ${index + 1}`} /></button>)}</div> : null}
            </div>
          </section>
          <section className="detail-title-block">
            <div className="property-reference"><span className="property-code"><InventoryBadge listing={listing} />{listing.displayCode || listing.code}</span><span className={`availability availability-${listing.availability.toLowerCase().replaceAll(" ", "-")}`}>{listing.availability}</span></div>
            <h1>{listing.title}</h1><p className="property-location"><MapPin size={17} /> {listing.location}</p><div className="detail-price-row"><strong className={`detail-price ${displayIntent === "WTL" && otherIntent === "WTS" ? "detail-price-rental" : ""} ${displayIntent === "WTS" ? "detail-price-sale" : ""}`}>{formatPrice(displayPrice, displayIntent)}</strong>{listing.cmiAgentName ? <small className="detail-cmi-agent">Agent: {listing.cmiAgentName}</small> : null}</div>{otherIntent && otherPrice != null ? <p className={`detail-alternate-offer ${displayIntent === "WTS" && otherIntent === "WTL" ? "detail-rental-offer" : ""}`}>Also available to {otherIntent === "WTL" ? "rent" : "buy"}: <strong>{formatPrice(otherPrice, otherIntent)}</strong></p> : null}
          </section>
          {displayIntent === "WTL" ? <section className="detail-section tenant-eligibility-section" aria-labelledby="tenant-eligibility-heading"><span className="eyebrow">Before enquiring</span><h2 id="tenant-eligibility-heading">Tenant eligibility</h2><p>{tenantEligibilityDescription(listing)}</p></section> : null}
          <section className="detail-section"><h2>Property overview</h2><p>{listing.description}</p><div className="detail-facts">{detailItems.map(([Icon, label, value]) => <div key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></div>)}</div></section>
          {listing.features.length ? <section className="detail-section"><h2>Property features</h2><ul className="check-list">{listing.features.map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul></section> : null}
          <section className="detail-section posting-details"><div className="posting-heading"><div><span className="eyebrow">Ready to share</span><h2>Posting details</h2></div><button className="button primary" type="button" onClick={onCopyPosting}><Copy size={17} /> {postingCopied ? "Copied" : "Copy posting"}</button></div><pre>{postingText(listing, agentProfile)}</pre></section>
          <p className="updated-line"><CalendarDays size={16} /> {listing.listedAt ? "Listed" : "Recorded"} {formatDate(listing.listedAt || listing.createdAt)} · Details are subject to confirmation.</p>
        </div>
        <aside className="agent-contact-card">
          <button className="agent-portrait-trigger" type="button" onClick={() => setAgentPortraitOpen(true)} aria-label="Enlarge agent portrait"><img src={agentProfile.portrait} alt={agentProfile.displayName} /></button><div><span className="eyebrow">Enquire directly</span><h2>{agentProfile.displayName}</h2><p>{agentProfile.title}</p><small>{agentProfile.agency}</small></div>
          <button className="button primary" type="button" onClick={() => openWhatsApp({ phone: agentProfile.whatsapp, message: enquiryText(listing, agentProfile.displayName), onError: (error) => window.alert(error) })}><MessageCircle size={18} /> WhatsApp enquiry</button>
          <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call {agentProfile.phoneDisplay}</a>
          <button className="button tertiary" type="button" onClick={onShare}><Share2 size={18} /> {copied ? "Link copied" : "Share property"}</button>
        </aside>
      </div>
      <RelatedListings listings={relatedListings} />
      {lightboxOpen ? <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${listing.title} photo viewer`}><button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="Close full photo view" autoFocus><X size={24} /></button>{galleryPhotos.length > 1 ? <button className="lightbox-arrow previous" type="button" onClick={() => movePhoto(-1)} aria-label="Previous photo"><ChevronLeft size={32} /></button> : null}<div className={`lightbox-image${lightboxSlide ? ` slide-${lightboxSlide}` : ""}`} onTouchStart={onLightboxTouchStart} onTouchEnd={onLightboxTouchEnd} onTouchCancel={() => { swipeStart.current = null; }} onAnimationEnd={() => setLightboxSlide("")}><PublicPropertyImage allowIndividualSave key={galleryPhotos[activePhoto]} src={galleryPhotos[activePhoto]} alt={`${listing.title} photo ${activePhoto + 1} fullscreen`} /><span className="lightbox-counter">{activePhoto + 1} / {galleryPhotos.length}</span></div>{galleryPhotos.length > 1 ? <button className="lightbox-arrow next" type="button" onClick={() => movePhoto(1)} aria-label="Next photo"><ChevronRight size={32} /></button> : null}</div> : null}
      <PortraitModal open={agentPortraitOpen} src={agentProfile.portrait} alt={`${agentProfile.displayName}, ${agentProfile.title}`} onClose={() => setAgentPortraitOpen(false)} />
    </main>
  );
}
