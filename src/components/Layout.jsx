import { Link, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { agentProfile } from "../config/agentProfile";
import { useAppVersionReload } from "../hooks/useAppVersionReload";

export function Layout() {
  useAppVersionReload();

  return (
    <div className="site-shell">
      <Header />
      <Outlet />
      <footer className="site-footer">
        <div className="page-width footer-grid">
          <div><strong>{agentProfile.websiteTitle}</strong><p>{agentProfile.title}</p></div>
          <div className="footer-links"><Link to="/">Properties</Link><Link to="/inquiries">Find a Property</Link><Link to="/about">About Me</Link><Link to="/contact">Contact</Link><Link className="footer-admin-link" to="/admin/inquiries">Inquiry Admin</Link></div>
          <p className="footer-disclaimer">Property information is provided for general reference and is subject to confirmation, availability and change without notice.</p>
        </div>
      </footer>
    </div>
  );
}
