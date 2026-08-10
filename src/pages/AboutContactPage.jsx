import { Check, CreditCard, Handshake, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "../components/ContactActions";
import { NameCardModal } from "../components/NameCardModal";
import { Seo } from "../components/Seo";
import { SITE_ORIGIN } from "../utils/seo";

export function AboutContactPage() {
  const [cardOpen, setCardOpen] = useState(false);
  return (
    <main className="page-width content-page">
      <Seo
        title="About & Contact HS Ong | Property Inventory"
        description="Meet Ong Hua Seong (HS Ong), Real Estate Negotiator serving Klang, Shah Alam, Bukit Tinggi, Bandar Botanic and nearby areas, and get in touch about a property enquiry."
        canonical={`${SITE_ORIGIN}/about`}
        ogTitle="About & Contact HS Ong"
      />
      <section className="contact-hero"><div><span className="eyebrow">Direct contact</span><h1>Let&apos;s discuss your property enquiry</h1><p>When contacting me, include the listing code, your preferred viewing time, or a short description of the property you need.</p><ContactActions includeEmail includeWhatsApp /></div><img src={agentProfile.portrait} alt={agentProfile.displayName} /></section>
      <div className="about-grid">
        <section className="content-card"><span className="eyebrow">How I can help</span><h2>Property-related services</h2><ul className="check-list large">{agentProfile.services.map((service) => <li key={service}><Check size={18} /> {service}</li>)}</ul></section>
        <section className="content-card accent"><Handshake size={28} /><span className="eyebrow">For fellow agents</span><h2>Open to co-broke opportunities</h2><p>{agentProfile.coBrokeMessage}</p><ContactActions includeWhatsApp includeEmail message={`Hi ${agentProfile.displayName}, I am a real estate agent and would like to discuss a co-broke opportunity.`} /></section>
      </div>
      <div className="contact-grid">
        <section className="content-card"><span className="eyebrow">Enquiry guidance</span><h2>Details to include</h2><p>Share the listing code and whether you are enquiring as a buyer, tenant, owner, or co-broke agent. For a viewing request, include a preferred date and time.</p></section>
        <section className="content-card"><span className="eyebrow">Areas served</span><h2>Klang and nearby areas</h2><div className="service-area-grid">{agentProfile.serviceAreas.map((area) => <span key={area}><MapPin size={16} /> {area}</span>)}</div><button className="button tertiary" type="button" onClick={() => setCardOpen(true)}><CreditCard size={18} /> View Name Card</button></section>
      </div>
      <section className="disclaimer-card"><ShieldCheck size={22} /><div><h2>General listing disclaimer</h2><p>All property information, pricing, availability, measurements and descriptions are provided for general reference only and should be independently verified before any decision or commitment. Images may be illustrative for mock catalogue records during initial development.</p></div></section>
      <NameCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </main>
  );
}
