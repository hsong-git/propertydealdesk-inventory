import { CreditCard, MapPin, MessageCircle, QrCode } from "lucide-react";
import { useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "../components/ContactActions";
import { NameCardModal } from "../components/NameCardModal";
import { whatsappUrl } from "../utils/listing";

export function ContactPage() {
  const [cardOpen, setCardOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("property enquiry");
  const openEnquiry = () => window.open(whatsappUrl(agentProfile.whatsapp, `Hi ${agentProfile.displayName}, my name is ${name.trim() || "a visitor"}. I would like to make a ${topic}.`), "_blank", "noopener,noreferrer");
  return (
    <main className="page-width content-page">
      <section className="contact-hero"><div><span className="eyebrow">Direct contact</span><h1>Let&apos;s discuss your property enquiry</h1><p>For the quickest response, send a WhatsApp message with the listing code, your preferred viewing time, or a short description of the property you need.</p><ContactActions includeEmail /></div><img src={agentProfile.portrait} alt={agentProfile.displayName} /></section>
      <div className="contact-grid">
        <section className="content-card"><span className="eyebrow">Start an enquiry</span><h2>Prepare a WhatsApp message</h2><div className="enquiry-fields"><label>Your name <input value={name} onChange={(event) => setName(event.target.value)} placeholder="How should I address you?" /></label><label>Enquiry type <select value={topic} onChange={(event) => setTopic(event.target.value)}><option>property enquiry</option><option>buyer enquiry</option><option>tenant enquiry</option><option>owner listing enquiry</option><option>co-broke enquiry</option></select></label></div><button className="button primary" type="button" onClick={openEnquiry}><MessageCircle size={18} /> Open in WhatsApp</button><p className="form-note">This opens WhatsApp with your message. Nothing is submitted or stored by this website.</p></section>
        <section className="content-card"><span className="eyebrow">Areas served</span><h2>Klang and nearby areas</h2><div className="service-area-grid">{agentProfile.serviceAreas.map((area) => <span key={area}><MapPin size={16} /> {area}</span>)}</div><button className="button tertiary" type="button" onClick={() => setCardOpen(true)}><CreditCard size={18} /> View Name Card</button></section>
        <section className="content-card qr-placeholder"><QrCode size={45} /><div><span className="eyebrow">WhatsApp QR</span><h2>QR code coming soon</h2><p>Use the WhatsApp button for now. A verified QR code can be added here later without changing the contact page structure.</p></div></section>
      </div>
      <NameCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </main>
  );
}
