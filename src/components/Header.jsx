import { Menu, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";
import { whatsappUrl } from "../utils/listing";

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="page-width header-inner">
        <Link className="brand-link" to="/" onClick={close}>
          <img src="/propertydealdesk-mark.png" alt="" />
          <span><strong>{agentProfile.brandName}</strong><small>HS Ong · {agentProfile.renNumber}</small></span>
        </Link>
        <button className="menu-button" type="button" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "open" : ""} aria-label="Main navigation">
          <NavLink to="/" onClick={close}>Properties</NavLink>
          <NavLink to="/about" onClick={close}>About Me</NavLink>
          <NavLink to="/contact" onClick={close}>Contact</NavLink>
          <a className="nav-whatsapp" href={whatsappUrl(agentProfile.whatsapp, `Hi ${agentProfile.displayName}, I would like to enquire about your property inventory.`)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
        </nav>
      </div>
    </header>
  );
}
