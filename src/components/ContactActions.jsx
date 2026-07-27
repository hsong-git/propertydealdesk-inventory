import { Mail, Phone } from "lucide-react";
import { agentProfile } from "../config/agentProfile";

export function ContactActions({ includeEmail = false, compact = false }) {
  return (
    <div className={`contact-actions ${compact ? "compact" : ""}`}>
      <a className="button secondary mobile-call" href={`tel:+${agentProfile.phone}`}><Phone size={18} /> Call</a>
      {includeEmail ? <a className="button secondary" href={`mailto:${agentProfile.email}`}><Mail size={18} /> Email</a> : null}
    </div>
  );
}
