import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, Check, Compass, Expand, ImageOff, MapPin, MessageCircle, Phone, Share2, Sofa, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { useInventory } from "../hooks";
import { enquiryText, formatDate, formatPrice, intentLabels, shareListing, whatsappUrl } from "../utils/listing";
import { PublicPropertyImage } from "../components/PublicPropertyImage";

export function PropertyPage() {
  const { slug } = useParams();
  const { items, loading, error } = useInventory();
  const listing = items.find((item) => item.slug === slug);
  const [activePhoto, setActivePhoto] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); setActivePhoto(0); }, [slug]);
  if (loading) return <main className="page-width page-state"><strong>Loading property details…</strong></main>;
  if (error || !listing) return <main className="page-width page-state"><strong>Property not found</strong><p>{error || "This listing may no longer be in the public inventory."}</p><Link className="button secondary" to="/"><ArrowLeft size={18} /> Back to Catalogue</Link></main>;
  const detailItems = [
    [Building2, "Property type", listing.propertyType], [BedDouble, "Bedrooms", listing.bedrooms ?? "N/A"], [Bath, "Bathrooms", listing.bathrooms ?? "N/A"],
    [Expand, "Built-up", listing.builtUpSqFt ? `${listing.builtUpSqFt.toLocaleString()} sq ft` : "N/A"], [Warehouse, "Land size", listing.landSize || "N/A"],
    [Sofa, "Furnishing", listing.furnishing], [Compass, "Facing", listing.facing || "N/A"], [Building2, "Unit type", listing.unitType || "N/A"],
  ];
  const onShare = async () => {
    try { if (await shareListing(listing) === "copied") { setCopied(true); window.setTimeout(() => setCopied(false), 1800); } } catch { /* cancelled */ }
  };
  return (
    <main className="page-width property-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} /> Back to Catalogue</Link>
      <div className="detail-layout">
        <div className="detail-main">
          <section className="gallery" aria-label="Property photos">
            <div className="gallery-main">{listing.photos[activePhoto]
              ? <PublicPropertyImage src={listing.photos[activePhoto]} alt={`${listing.title} photo ${activePhoto + 1}`} />
              : <span className="property-photo-placeholder detail-placeholder"><ImageOff size={38} /><small>No public photo supplied</small></span>}
              <span className={`intent intent-${listing.intent.toLowerCase()}`}>{listing.intent}<small>{intentLabels[listing.intent]}</small></span></div>
            {listing.photos.length > 1 ? <div className="gallery-thumbnails">{listing.photos.map((photo, index) => <button type="button" className={index === activePhoto ? "active" : ""} onClick={() => setActivePhoto(index)} key={photo}><PublicPropertyImage src={photo} alt={`View photo ${index + 1}`} /></button>)}</div> : null}
          </section>
          <section className="detail-title-block">
            <div className="property-reference"><span>{listing.code}</span><span className={`availability availability-${listing.availability.toLowerCase().replaceAll(" ", "-")}`}>{listing.availability}</span></div>
            <h1>{listing.title}</h1><p className="property-location"><MapPin size={17} /> {listing.location}</p><strong className="detail-price">{formatPrice(listing.price, listing.intent)}</strong>
          </section>
          <section className="detail-section"><h2>Property overview</h2><p>{listing.description}</p><div className="detail-facts">{detailItems.map(([Icon, label, value]) => <div key={label}><Icon size={19} /><span>{label}</span><strong>{value}</strong></div>)}</div></section>
          <section className="detail-columns"><div className="detail-section"><h2>Property features</h2><ul className="check-list">{listing.features.map((item) => <li key={item}><Check size={17} /> {item}</li>)}</ul></div><div className="detail-section"><h2>Nearby amenities</h2><ul className="check-list">{listing.amenities.map((item) => <li key={item}><MapPin size={17} /> {item}</li>)}</ul></div></section>
          <section className="detail-section"><h2>Why this property</h2><div className="reason-grid">{listing.whyThisProperty.map((item, index) => <article key={item}><span>0{index + 1}</span><p>{item}</p></article>)}</div></section>
          <p className="updated-line"><CalendarDays size={16} /> Last updated {formatDate(listing.updatedAt)} · Details are subject to confirmation.</p>
        </div>
        <aside className="agent-contact-card">
          <img src={agentProfile.portrait} alt={agentProfile.displayName} /><div><span className="eyebrow">Enquire directly</span><h2>{agentProfile.displayName}</h2><p>{agentProfile.title} · {agentProfile.renNumber}</p><small>{agentProfile.agency}</small></div>
          <a className="button primary" href={whatsappUrl(agentProfile.whatsapp, enquiryText(listing, agentProfile.displayName))} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp enquiry</a>
          <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call {agentProfile.phoneDisplay}</a>
          <button className="button tertiary" type="button" onClick={onShare}><Share2 size={18} /> {copied ? "Link copied" : "Share property"}</button>
        </aside>
      </div>
    </main>
  );
}
