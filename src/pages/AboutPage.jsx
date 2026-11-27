import { useSiteLanguage } from "../components/InquiryLanguage";
import { Check, Handshake, ShieldCheck } from "lucide-react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "../components/ContactActions";
import { ProfilePanel } from "../components/ProfilePanel";
import { Seo } from "../components/Seo";
import { SITE_ORIGIN } from "../utils/seo";

export function AboutPage() {
  const { t: tSite } = useSiteLanguage();
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
        <section className="content-card"><span className="eyebrow">{tSite("How I can help")}</span><h2>{tSite("Property-related services")}</h2><ul className="check-list large">{tSite(agentProfile.services.map((service) => <li key={service}><Check size={18} /> {tSite(service)}</li>))}</ul></section>
        <section className="content-card accent"><Handshake size={28} /><span className="eyebrow">{tSite("For fellow agents")}</span><h2>{tSite("Open to co-broke opportunities")}</h2><p>{tSite(agentProfile.coBrokeMessage)}</p><ContactActions includeWhatsApp includeEmail message={`Hi ${agentProfile.displayName}, I am a real estate agent and would like to discuss a co-broke opportunity.`} /></section>
      </div>
      <section className="content-card"><h2>{tSite("Professional details")}</h2><p>{tSite(agentProfile.name)}{tSite(" · ")}{tSite(agentProfile.renNumber)}{tSite(" · ")}{tSite(agentProfile.agency)}</p><p>{tSite("Telephone: ")}<a href={`tel:+${agentProfile.phone}`}>{tSite(agentProfile.phoneDisplay)}</a>{tSite(" · Email: ")}<a href={`mailto:${agentProfile.email}`}>{tSite(agentProfile.email)}</a></p><a className="button secondary" href="/contact">{tSite("Contact HS Ong")}</a></section>
      <section className="disclaimer-card"><ShieldCheck size={22} /><div><h2>{tSite("General listing disclaimer")}</h2><p>{tSite("Property information, pricing, availability, measurements and descriptions should be independently verified before any decision or commitment.")}</p></div></section>
    </main>
  );
}
