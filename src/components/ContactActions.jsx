import { useSiteLanguage } from "./InquiryLanguage";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { agentProfile } from "../config/agentProfile";
import { openWhatsApp } from "../utils/whatsapp";

export function ContactActions({ message, includeCall = true, includeEmail = false, includeWhatsApp = false, whatsappLabel = "WhatsApp", compact = false, callMobileOnly = true }) {
  const { t: tSite } = useSiteLanguage();
  const whatsappMessage = message || `Hi ${agentProfile.displayName}, I would like to make a property enquiry.`;
  return (
    <div className={`contact-actions ${compact ? "compact" : ""}`}>
      {tSite(includeWhatsApp ? <button className="button primary" type="button" onClick={() => openWhatsApp({ phone: agentProfile.whatsapp, message: whatsappMessage, onError: (error) => window.alert(error) })}><MessageCircle size={18} /> {tSite(whatsappLabel)}</button> : null)}
      {tSite(includeCall ? <a className={`button secondary${callMobileOnly ? " mobile-call" : ""}`} href={`tel:+${agentProfile.phone}`}><Phone size={18} />{tSite(" Call")}</a> : null)}
      {tSite(includeEmail ? <a className="button secondary" href={`mailto:${agentProfile.email}`}><Mail size={18} />{tSite(" Email")}</a> : null)}
    </div>
  );
}
