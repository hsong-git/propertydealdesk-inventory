import { useSiteLanguage } from "./InquiryLanguage";
import { BadgeCheck, BriefcaseBusiness, CreditCard } from "lucide-react";
import { useState } from "react";
import { agentProfile } from "../config/agentProfile";
import { ContactActions } from "./ContactActions";
import { NameCardModal } from "./NameCardModal";
import { PortraitModal } from "./PortraitModal";

export function ProfilePanel({ expanded = false }) {
  const { t: tSite } = useSiteLanguage();
  const [cardOpen, setCardOpen] = useState(false);
  const [portraitOpen, setPortraitOpen] = useState(false);
  const portrait = expanded ? agentProfile.aboutPortrait || agentProfile.portrait : agentProfile.portrait;
  return (
    <>
      <section className={`profile-panel ${expanded ? "expanded" : ""}`}>
        <button className={`portrait-wrap ${expanded ? "portrait-static" : "portrait-zoom-trigger"}`} type="button" onClick={() => !expanded && setPortraitOpen(true)} aria-label={tSite(expanded ? undefined : "Enlarge profile portrait")}>
          <img src={portrait} alt={tSite(`${agentProfile.displayName}, ${agentProfile.title}`)} />
        </button>
        <div className="profile-copy">
          <span className="eyebrow"><BadgeCheck size={15} />{tSite(" Registered property professional")}</span>
          <h1>{tSite(agentProfile.profilePanelName || (expanded ? agentProfile.name : agentProfile.displayName))}</h1>
          <p className="profile-role">{tSite(agentProfile.title)}</p>
          <p className="profile-agency"><BriefcaseBusiness size={16} /> {tSite(agentProfile.agency)}</p>
          <p>{tSite(expanded ? agentProfile.professionalIntroduction : agentProfile.shortIntroduction)}</p>
          <div className="profile-actions">
            {tSite(expanded ? null : <ContactActions compact includeWhatsApp includeEmail includeCall={false} />)}
            {tSite(expanded ? null : <button className="profile-name-card-icon" type="button" onClick={() => setCardOpen(true)} aria-label={tSite("View Name Card")} title={tSite("View Name Card")}><CreditCard size={16} aria-hidden="true" /></button>)}
            <button className="button tertiary" type="button" onClick={() => setCardOpen(true)}><CreditCard size={18} />{tSite(" View Name Card")}</button>
          </div>
        </div>
      </section>
      <NameCardModal open={cardOpen} onClose={() => setCardOpen(false)} />
      <PortraitModal open={portraitOpen} src={portrait} alt={tSite(`${agentProfile.displayName}, ${agentProfile.title}`)} onClose={() => setPortraitOpen(false)} />
    </>
  );
}
