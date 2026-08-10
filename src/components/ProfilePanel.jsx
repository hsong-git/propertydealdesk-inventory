import { BadgeCheck, BriefcaseBusiness, CreditCard, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "./ContactActions";
import { NameCardModal } from "./NameCardModal";

export function ProfilePanel({ expanded = false }) {
  const [cardOpen, setCardOpen] = useState(false);
  const portrait = expanded ? agentProfile.aboutPortrait || agentProfile.portrait : agentProfile.portrait;
  return (
    <>
      <section className={`profile-panel ${expanded ? "expanded" : ""}`}>
        <div className="portrait-wrap"><img src={portrait} alt={`${agentProfile.displayName}, ${agentProfile.title}`} /></div>
        <div className="profile-copy">
          <span className="eyebrow"><BadgeCheck size={15} /> Registered property professional</span>
          <h1>{agentProfile.profilePanelName || (expanded ? agentProfile.name : agentProfile.displayName)}</h1>
          <p className="profile-role">{agentProfile.title}</p>
          <p className="profile-agency"><BriefcaseBusiness size={16} /> {agentProfile.agency}</p>
          <p>{expanded ? agentProfile.professionalIntroduction : agentProfile.shortIntroduction}</p>
          <div className="area-list" aria-label="Main service areas"><MapPin size={16} /> {agentProfile.serviceAreas.map((area) => <span key={area}>{area}</span>)}</div>
          <div className="profile-actions">
            {expanded ? null : <Link className="button primary profile-requirement-link" to="/inquiries">Find a Property for Me</Link>}
            {expanded ? null : <ContactActions compact includeWhatsApp includeEmail includeCall={false} />}
            {expanded ? null : <button className="profile-name-card-icon" type="button" onClick={() => setCardOpen(true)} aria-label="View Name Card" title="View Name Card"><CreditCard size={16} aria-hidden="true" /></button>}
            <button className="button tertiary" type="button" onClick={() => setCardOpen(true)}><CreditCard size={18} /> View Name Card</button>
          </div>
        </div>
      </section>
      <NameCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
    </>
  );
}
