import { useSiteLanguage } from "../components/InquiryLanguage";
import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, Compass, Copy, Expand, ImageOff, MapPin, Maximize2, MessageCircle, Phone, Share2, Sofa, Warehouse, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FirstTimeEnquiryDialog } from "../components/FirstTimeEnquiryDialog";
import { propertyEnquiryTarget } from "../utils/propertyEnquiry.js";
import { agentProfile } from "../config/agentProfile";
import { useInventory } from "../hooks";
import { enquiryText, formatDate, formatPrice, intentLabels, postingText, shareListing, tenantEligibilityDescription } from "../utils/listing";
import { openWhatsApp } from "../utils/whatsapp";
import { PublicPropertyImage } from "../components/PublicPropertyImage";
import { ShareSelectedPhotosButton } from "../components/ShareSelectedPhotosButton";
import { Seo } from "../components/Seo";
import { ListingUnavailableState } from "../components/ListingUnavailableState";
import { propertyBreadcrumbs, propertyJsonLd, propertySeoDescription, propertySeoTitle, SITE_ORIGIN } from "../utils/seo";
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
import { trackEvent } from "../utils/analytics";
import { AreaLinks } from "../components/AreaLinks";
import { ViewingRequest, PropertyMapLinks, MortgageEstimate, RentalMoveInEstimate } from "../components/PropertyTools";
import { SavePropertyButton } from "../components/Shortlist";

const photoSharingEnabled = import.meta.env.VITE_ENABLE_PHOTO_SHARING !== "false";

export function PropertyPage() {
  const navigate = useNavigate();
  const [enquiryPromptOpen, setEnquiryPromptOpen] = useState(false);
  const { t: tSite } = useSiteLanguage();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { items, allItems, locationDictionary, loading, error } = useInventory();
  const listing = allItems.find((item) => item.slug === slug);
  const [activePhoto, setActivePhoto] = useState(0);
  const [landscapePhoto, setLandscapePhoto] = useState("");
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
  const seoTitle = listing ? propertySeoTitle(listing) : "Property Details | HS Ong Property Inventory";
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
  }, [slug, listing?.code, listing?.inventoryVersion, requestedMedia, hasLayouts, firstVideo]);
  useEffect(() => {
    if (!listing?.code) return;
    rememberListingView(listing.code);
    fetch("/api/listing-views", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: listing.code }) }).catch(() => {});
    trackEvent("listing_view", { listingCode: listing.code, intent: displayIntent || listing.intent });
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
  if (loading) return <main className="page-width page-state"><Seo title="Loading property details | HS Ong Property Inventory" canonical={seoCanonical} /><strong>{tSite("Loading property details…")}</strong></main>;
  if (error || !listing) return <><Seo title="Property no longer available | HS Ong Property Inventory" description="This property may have been sold, rented, withdrawn, or removed from HS Ong Property Inventory." canonical={seoCanonical} robots="noindex, follow" /><ListingUnavailableState code={slug} error={error} /></>;
  const detailItems = [
    [Building2, "Property type", listing.propertyType], [BedDouble, "Bedrooms", listing.bedrooms ?? "N/A"], [Bath, "Bathrooms", listing.bathrooms ?? "N/A"],
    [Expand, "Built-up", listing.builtUpSqFt ? `${listing.builtUpSqFt.toLocaleString()} sq ft` : "N/A"], [Warehouse, "Land size", listing.landSize || "N/A"],
    [Sofa, "Furnishing", listing.furnishing], [Compass, "Facing", listing.facing || "N/A"], [Building2, "Unit type", listing.unitType || "N/A"],
  ];
  const onShare = async () => {
    try { if (await shareListing(listing) === "copied") { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } trackEvent("share_property", { listingCode: listing.code, intent: displayIntent, properties: { placement: "detail" } }); } catch { /* cancelled */ }
  };
  const onCopyPosting = async () => {
    await navigator.clipboard.writeText(postingText(listing, agentProfile));
    trackEvent("copy_posting", { listingCode: listing.code, intent: displayIntent, properties: { placement: "detail" } });
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
  const enquireOnWhatsApp = (placement) => {
    trackEvent("whatsapp_click", { listingCode: listing.code, intent: displayIntent, properties: { placement } });
    openWhatsApp({ phone: agentProfile.whatsapp, message: enquiryText(listing, agentProfile.displayName, { intent: displayIntent }), onError: (error) => window.alert(error) });
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
      <Link className="back-link" to={listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "/cmi" : "/"}><ArrowLeft size={17} /> {tSite(listing.visibility === "unlisted" && !COMBINED_CATALOGUE ? "Back to CMI Catalogue" : "Back to Catalogue")}</Link>
      <AreaLinks items={items} dictionary={locationDictionary} listing={listing} />
      <div className="detail-layout">
        <div className="detail-main">
          <section className="gallery" aria-label={tSite("Property photos, layouts and videos")}>
            {tSite(activeVideo && listing.videos?.includes(activeVideo) ? <PropertyVideo src={activeVideo} title={tSite(listing.title)} poster={listing.photos[0]} /> : null)}
            <div hidden={activeVideo !== null && listing.videos?.includes(activeVideo)}>
            <div className={`gallery-main${activeGallery === "layout" ? " is-layout" : ""}${activeGallery === "photos" && landscapePhoto === galleryPhotos[activePhoto] ? " is-landscape" : ""}`}>{tSite(galleryPhotos[activePhoto]
              ? <button className="gallery-open" type="button" onClick={() => { setLightboxOpen(true); trackEvent("photo_view", { listingCode: listing.code, intent: displayIntent, properties: { media: activeGallery, index: activePhoto + 1 } }); }} aria-label={tSite(`Open ${activeGallery === "layout" ? "layout" : "photo"} ${activePhoto + 1} of ${galleryPhotos.length} fullscreen`)}><PublicPropertyImage className={activeGallery === "photos" && galleryPhotos[activePhoto] === listing.adPage ? "is-ad-page" : ""} allowIndividualSave onLoad={event => setLandscapePhoto(event.currentTarget.naturalWidth >= event.currentTarget.naturalHeight ? galleryPhotos[activePhoto] : "")} src={galleryPhotos[activePhoto]} alt={tSite(`${listing.title} ${activeGallery === "layout" ? "layout" : "photo"} ${activePhoto + 1}`)} /><span className="gallery-open-label"><Maximize2 size={17} />{tSite(" Full view")}</span></button>
              : <span className="property-photo-placeholder detail-placeholder"><ImageOff size={38} /><small>{tSite("No public photo supplied")}</small></span>)}
              </div>
            </div>
            {tSite(listing.layouts?.length || listing.videos?.length ? <div className="gallery-video-controls" aria-label={tSite("Property media")}><button type="button" className={activeGallery === "photos" ? "active" : ""} aria-pressed={activeGallery === "photos"} onClick={() => { setActiveGallery("photos"); setActivePhoto(0); setActiveVideo(null); trackEvent("media_open", { listingCode: listing.code, intent: displayIntent, properties: { media: "photos" } }); }}>{tSite("Photos")}</button>{tSite(listing.layouts?.length ? <button type="button" className={activeGallery === "layout" ? "active" : ""} aria-pressed={activeGallery === "layout"} onClick={() => { setActiveGallery("layout"); setActivePhoto(0); setActiveVideo(null); trackEvent("media_open", { listingCode: listing.code, intent: displayIntent, properties: { media: "layout" } }); }}>{tSite("Layout")}</button> : null)}{tSite(listing.videos?.length ? <button type="button" className={activeGallery === "videos" ? "active" : ""} aria-pressed={activeGallery === "videos"} onClick={() => { setActiveGallery("videos"); setActiveVideo(listing.videos[0]); trackEvent("media_open", { listingCode: listing.code, intent: displayIntent, properties: { media: "videos" } }); }}>{tSite("Videos")}</button> : null)}</div> : null)}
            {tSite(activeGallery === "videos" && listing.videos?.length > 1 ? <div className="gallery-video-controls" aria-label={tSite("Choose video")}>{tSite(listing.videos.map((src, index) => <button type="button" key={src} className={activeVideo === src ? "active" : ""} aria-pressed={activeVideo === src} onClick={() => setActiveVideo(src)}>{tSite("▶ Video ")}{tSite(index + 1)}</button>))}</div> : null)}
            <div hidden={activeVideo !== null && listing.videos?.includes(activeVideo)}>
            {tSite(activeGallery === "photos" && photoSharingEnabled && galleryPhotos.length > 0 ? <><div className="gallery-thumbnails">{tSite(galleryPhotos.map((photo, index) => { const selected = selectedPhotos.includes(photo); const blocked = selectedPhotos.length >= PHOTO_SELECTION_LIMIT && !selected; return <div className="gallery-thumbnail-choice" key={photo}><button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)}><PublicPropertyImage allowIndividualSave src={photo} alt={tSite(`View photo ${index + 1}`)} /></button><button type="button" disabled={blocked} className={`photo-select-toggle${selected ? " selected" : ""}${blocked ? " is-blocked" : ""}`} aria-label={tSite(`${selected ? "Deselect" : "Select"} photo ${index + 1}`)} aria-pressed={selected} onClick={() => setSelectedPhotos((current) => selected ? current.filter((item) => item !== photo) : current.length < PHOTO_SELECTION_LIMIT ? [...current, photo] : current)}>{tSite(selected ? <Check size={14} /> : <span />)}</button></div>; }))}</div><button className="select-first-photos" type="button" onClick={selectFirstPhotos} disabled={!galleryPhotos.length} aria-pressed={firstPhotosSelected}>{tSite(firstPhotosSelected ? "Deselect first " : "Select first ")}{tSite(Math.min(PHOTO_SELECTION_LIMIT, galleryPhotos.length))}</button><ShareSelectedPhotosButton listing={listing} selectedPhotos={selectedPhotos} /></> : galleryPhotos.length > 1 ? <div className="gallery-thumbnails">{tSite(galleryPhotos.map((photo, index) => <button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)} key={photo}><PublicPropertyImage allowIndividualSave src={photo} alt={tSite(`View photo ${index + 1}`)} /></button>))}</div> : null)}
            </div>
            {tSite(activeGallery === "layout" && photoSharingEnabled && galleryPhotos[activePhoto] ? <ShareSelectedPhotosButton key={`${listing.code}-layout-${activePhoto}-${galleryPhotos[activePhoto]}`} listing={listing} layoutIndex={activePhoto} /> : null)}
          </section>
          <section className="detail-title-block">
            <div className="property-reference"><span className="property-code"><InventoryBadge listing={listing} />{tSite(listing.displayCode || listing.code)}</span><span className={`intent intent-${displayIntent.toLowerCase()}`}>{tSite(displayIntent)}<small>{tSite(intentLabels[displayIntent])}</small></span></div>
            <h1>{tSite(listing.title)}</h1><p className="property-location"><MapPin size={17} /> {tSite(listing.location)}</p><div className="detail-price-row"><strong className={`detail-price ${displayIntent === "WTL" && otherIntent === "WTS" ? "detail-price-rental" : ""} ${displayIntent === "WTS" ? "detail-price-sale" : ""}`}>{tSite(formatPrice(displayPrice, displayIntent))}</strong>{tSite(listing.cmiAgentName ? <small className="detail-cmi-agent">{tSite("Agent: ")}{tSite(listing.cmiAgentName)}</small> : null)}</div>{tSite(otherIntent && otherPrice != null ? <p className={`detail-alternate-offer ${displayIntent === "WTS" && otherIntent === "WTL" ? "detail-rental-offer" : ""}`}>{tSite("Also available to ")}{tSite(otherIntent === "WTL" ? "rent" : "buy")}{tSite(": ")}<strong>{tSite(formatPrice(otherPrice, otherIntent))}</strong></p> : null)}
          </section>
          {tSite(displayIntent === "WTL" ? <section className="detail-section tenant-eligibility-section" aria-labelledby="tenant-eligibility-heading"><span className="eyebrow">{tSite("Before enquiring")}</span><h2 id="tenant-eligibility-heading">{tSite("Tenant eligibility")}</h2><p>{tSite(tenantEligibilityDescription(listing))}</p></section> : null)}
          <section className="detail-section"><h2>{tSite("Property overview")}</h2><p>{tSite(listing.description)}</p><div className="detail-facts">{tSite(detailItems.map(([Icon, label, value]) => <div key={label}><Icon size={19} /><span>{tSite(label)}</span><strong>{tSite(value)}</strong></div>))}</div></section>
          {tSite(listing.features.length ? <section className="detail-section"><h2>{tSite("Property features")}</h2><ul className="check-list">{tSite(listing.features.map((item) => <li key={item}><Check size={17} /> {tSite(item)}</li>))}</ul></section> : null)}
          <PropertyMapLinks listing={listing} />
          {tSite(displayIntent === "WTS" && Number.isFinite(displayPrice) && displayPrice > 0 ? <MortgageEstimate key={`${listing.code}-${displayPrice}`} price={displayPrice} /> : null)}
          {displayIntent === "WTL" && Number.isFinite(displayPrice) && displayPrice > 0 ? <RentalMoveInEstimate key={`${listing.code}-${displayPrice}`} price={displayPrice} /> : null}
          <section className="detail-section posting-details"><div className="posting-heading"><div><span className="eyebrow">{tSite("Ready to share")}</span><h2>{tSite("Posting details")}</h2></div><button className="button primary" type="button" onClick={onCopyPosting}><Copy size={17} /> {tSite(postingCopied ? "Copied" : "Copy posting")}</button></div><pre>{tSite(postingText(listing, agentProfile))}</pre></section>
          <p className="updated-line"><CalendarDays size={16} /> {tSite(listing.listedAt ? "Listed" : "Recorded")} {tSite(formatDate(listing.listedAt || listing.createdAt))}{tSite(" · Details are subject to confirmation.")}</p>
        </div>
        <aside className="agent-contact-card">
          <button className="agent-portrait-trigger" type="button" onClick={() => setAgentPortraitOpen(true)} aria-label={tSite("Enlarge agent portrait")}><img src={agentProfile.portrait} alt={tSite(agentProfile.displayName)} /></button><div><span className="eyebrow">{tSite("Enquire directly")}</span><h2>{tSite(agentProfile.displayName)}</h2><p>{tSite(agentProfile.title)}</p><small>{tSite(agentProfile.agency)}</small></div>
          <button className="button primary" type="button" onClick={() => enquireOnWhatsApp("detail")}><MessageCircle size={18} />{tSite(" WhatsApp enquiry")}</button>
          <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} />{tSite(" Call ")}{tSite(agentProfile.phoneDisplay)}</a>
          <button className="button tertiary" type="button" onClick={onShare}><Share2 size={18} /> {tSite(copied ? "Link copied" : "Share property")}</button>
          <SavePropertyButton listing={listing} />
          <ViewingRequest key={`${listing.code}-${displayIntent}`} listing={listing} intent={displayIntent} />
        </aside>
      </div>
      <RelatedListings listings={relatedListings} />
      {!lightboxOpen && !agentPortraitOpen ? <div className="property-whatsapp-dock"><button className="button primary" type="button" onClick={() => setEnquiryPromptOpen(true)}><MessageCircle size={20} /><span>{tSite("WhatsApp enquiry")} · {listing.displayCode || listing.code}</span></button></div> : null}
      <FirstTimeEnquiryDialog open={enquiryPromptOpen} onClose={() => setEnquiryPromptOpen(false)} onFirstTime={() => { setEnquiryPromptOpen(false); navigate(propertyEnquiryTarget(listing, displayIntent)); }} onReturning={() => { setEnquiryPromptOpen(false); enquireOnWhatsApp("detail_floating"); }} />
      {tSite(lightboxOpen ? <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={tSite(`${listing.title} photo viewer`)}><button className="lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label={tSite("Close full photo view")} autoFocus><X size={24} /></button>{tSite(galleryPhotos.length > 1 ? <button className="lightbox-arrow previous" type="button" onClick={() => movePhoto(-1)} aria-label={tSite("Previous photo")}><ChevronLeft size={32} /></button> : null)}<div className={`lightbox-image${lightboxSlide ? ` slide-${lightboxSlide}` : ""}`} onTouchStart={onLightboxTouchStart} onTouchEnd={onLightboxTouchEnd} onTouchCancel={() => { swipeStart.current = null; }} onAnimationEnd={() => setLightboxSlide("")}><PublicPropertyImage allowIndividualSave key={galleryPhotos[activePhoto]} src={galleryPhotos[activePhoto]} alt={tSite(`${listing.title} photo ${activePhoto + 1} fullscreen`)} /><span className="lightbox-counter">{tSite(activePhoto + 1)}{tSite(" / ")}{tSite(galleryPhotos.length)}</span></div>{tSite(galleryPhotos.length > 1 ? <button className="lightbox-arrow next" type="button" onClick={() => movePhoto(1)} aria-label={tSite("Next photo")}><ChevronRight size={32} /></button> : null)}</div> : null)}
      <PortraitModal open={agentPortraitOpen} src={agentProfile.portrait} alt={tSite(`${agentProfile.displayName}, ${agentProfile.title}`)} onClose={() => setAgentPortraitOpen(false)} />
    </main>
  );
}
