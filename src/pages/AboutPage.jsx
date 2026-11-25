import { Check, Handshake, ShieldCheck } from "lucide-react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "../components/ContactActions";
import { ProfilePanel } from "../components/ProfilePanel";
import { Seo } from "../components/Seo";
import { SITE_ORIGIN } from "../utils/seo";

export function AboutPage() {
  return (
    <main className="page-width content-page">
      <Seo
        title="About HS Ong | Real Estate Negotiator"
        description="Learn about Ong Hua Seong (HS Ong), Real Estate Negotiator serving Klang, Shah Alam, Bukit Tinggi, Bandar Botanic and nearby areas."
        canonical={`${SITE_ORIGIN}/about`}
        ogTitle="About HS Ong"
      />
      <ProfilePanel expanded />
      <div className="about-grid">
        <section className="content-card"><span className="eyebrow">How I can help</span><h2>Property-related services</h2><ul className="check-list large">{agentProfile.services.map((service) => <li key={service}><Check size={18} /> {service}</li>)}</ul></section>
        <section className="content-card accent"><Handshake size={28} /><span className="eyebrow">For fellow agents</span><h2>Open to co-broke opportunities</h2><p>{agentProfile.coBrokeMessage}</p><ContactActions includeWhatsApp includeEmail message={`Hi ${agentProfile.displayName}, I am a real estate agent and would like to discuss a co-broke opportunity.`} /></section>
      </div>
      <section className="content-card"><h2>Professional details</h2><p>{agentProfile.name} · {agentProfile.renNumber} · {agentProfile.agency}</p><p>Telephone: <a href={`tel:+${agentProfile.phone}`}>{agentProfile.phoneDisplay}</a> · Email: <a href={`mailto:${agentProfile.email}`}>{agentProfile.email}</a></p><a className="button secondary" href="/contact">Contact HS Ong</a></section>
      <section className="disclaimer-card"><ShieldCheck size={22} /><div><h2>General listing disclaimer</h2><p>Property information, pricing, availability, measurements and descriptions should be independently verified before any decision or commitment.</p></div></section>
    </main>
  );
}
