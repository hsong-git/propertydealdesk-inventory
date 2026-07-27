import { Mail, MessageCircle, Phone } from "lucide-react";
import { agentProfile } from "../config/agentProfile";
import { whatsappUrl } from "../utils/listing";

export function ContactActions({ includeEmail = false, includeWhatsApp = false, compact = false }) {
  return (
    <div className={`contact-actions ${compact ? "compact" : ""}`}>
      {includeWhatsApp ? <a className="button primary" href={whatsappUrl(agentProfile.whatsapp, `Hi ${agentProfile.displayName}, I would like to make a property enquiry.`)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a> : null}
      <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call</a>
      {includeEmail ? <a className="button secondary" href={`mailto:${agentProfile.email}`}><Mail size={18} /> Email</a> : null}
    </div>
  );
}
