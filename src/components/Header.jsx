import { useSiteLanguage } from "./InquiryLanguage";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { SiteLanguagePicker } from "./InquiryLanguage";
import { useShortlist } from "./Shortlist";

export function Header() {
  const { t: tSite } = useSiteLanguage();
  const { keys } = useShortlist();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <Link className="brand-link" to="/" onClick={close}>
          <img src="/propertydealdesk-mark.png" alt={tSite("")} />
          <span><strong>{tSite(agentProfile.brandName)}</strong><small>{tSite("HS Ong · ")}{tSite(agentProfile.title)}</small></span>
        </Link>
        <SiteLanguagePicker />
        <button className="menu-button" type="button" aria-expanded={open} aria-label={tSite(open ? "Close menu" : "Open menu")} onClick={() => setOpen((value) => !value)}>
          {tSite(open ? <X /> : <Menu />)}
        </button>
        <nav className={open ? "open" : ""} aria-label={tSite("Main navigation")}>
          <NavLink to="/" onClick={close}>{tSite("Properties")}</NavLink>
          <NavLink to="/inquiries" onClick={close}>{tSite("Find a Property")}</NavLink>
          <NavLink to="/saved" onClick={close}>{tSite("Saved (")}{tSite(keys.length)}{tSite(")")}</NavLink>
        </nav>
      </div>
    </header>
  );
}
