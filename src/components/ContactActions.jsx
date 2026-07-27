import { Mail, MessageCircle, Phone } from "lucide-react";
import { agentProfile } from "../config/agentProfile";
import { whatsappUrl } from "../utils/listing";

export function ContactActions({ message, includeEmail = false, compact = false }) {
  const text = message || `Hi ${agentProfile.displayName}, I would like to enquire about your current property inventory.`;
  return (
    <div className={`contact-actions ${compact ? "compact" : ""}`}>
      <a className="button primary" href={whatsappUrl(agentProfile.whatsapp, text)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
      <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call</a>
      {includeEmail ? <a className="button secondary" href={`mailto:${agentProfile.email}`}><Mail size={18} /> Email</a> : null}
    </div>
  );
}
