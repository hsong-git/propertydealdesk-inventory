import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { agentProfile } from "../config/agentProfile";

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
          <NavLink className="nav-requirements" to="/inquiries" onClick={close}>Find a Property</NavLink>
          <a className="button primary nav-agent-tools" href="https://agenttools.myeviv.com/" target="_blank" rel="noopener noreferrer" onClick={close}>Agent Tools</a>
        </nav>
      </div>
    </header>
  );
}
