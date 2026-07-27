import { CreditCard, MapPin } from "lucide-react";
import { useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "../components/ContactActions";
import { NameCardModal } from "../components/NameCardModal";

export function ContactPage() {
  const [cardOpen, setCardOpen] = useState(false);
  return (
    <main className="page-width content-page">
      <section className="contact-hero"><div><span className="eyebrow">Direct contact</span><h1>Let&apos;s discuss your property enquiry</h1><p>When contacting me, include the listing code, your preferred viewing time, or a short description of the property you need.</p><ContactActions includeEmail /></div><img src={agentProfile.portrait} alt={agentProfile.displayName} /></section>
      <div className="contact-grid">
        <section className="content-card"><span className="eyebrow">Enquiry guidance</span><h2>Details to include</h2><p>Share the listing code and whether you are enquiring as a buyer, tenant, owner, or co-broke agent. For a viewing request, include a preferred date and time.</p><ContactActions includeEmail /></section>
        <section className="content-card"><span className="eyebrow">Areas served</span><h2>Klang and nearby areas</h2><div className="service-area-grid">{agentProfile.serviceAreas.map((area) => <span key={area}><MapPin size={16} /> {area}</span>)}</div><button className="button tertiary" type="button" onClick={() => setCardOpen(true)}><CreditCard size={18} /> View Name Card</button></section>
      </div>
      <NameCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </main>
  );
}
