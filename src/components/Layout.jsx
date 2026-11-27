import { useSiteLanguage } from "./InquiryLanguage";
import { Link } from "react-router-dom";
import { RouteContent } from "./RouteContent";
import { Header } from "./Header";
import { agentProfile } from "../config/agentProfile";
import { COMBINED_CATALOGUE, PUBLIC_ADMIN_ORIGIN } from "../config/catalogueSite.js";
import { useAppVersionReload } from "../hooks/useAppVersionReload";
import { RecentViewingPill } from "./RecentViewingPill";
import { ScrollToTopButton } from "./ScrollToTopButton";
import { useEffect } from "react";
import { startAnalyticsEngagement } from "../utils/analytics";

export function Layout() {
  const { t: tSite } = useSiteLanguage();
  useAppVersionReload();
  useEffect(() => startAnalyticsEngagement(), []);

  return (
    <div className="site-shell">
      <Header />
      <RouteContent />
      <RecentViewingPill />
      <ScrollToTopButton />
      <footer className="site-footer">
        <div className="page-width footer-grid">
          <div><strong>{tSite(agentProfile.websiteTitle)}</strong><p>{tSite(agentProfile.title)}</p><div className="footer-links"><Link to="/about">{tSite("About HS Ong")}</Link><Link to="/contact">{tSite("Contact")}</Link></div></div>
          <div className="footer-links"><Link to="/">{tSite("Properties")}</Link><Link to="/inquiries">{tSite("Find a Property")}</Link>{tSite(COMBINED_CATALOGUE ? <a className="footer-admin-link" href={`${PUBLIC_ADMIN_ORIGIN}/admin/inquiries`}>{tSite("Inquiry Admin")}</a> : <Link className="footer-admin-link" to="/admin/inquiries">{tSite("Inquiry Admin")}</Link>)}</div>
          <p className="footer-disclaimer">{tSite("Property information is provided for general reference and is subject to confirmation, availability and change without notice.")}</p>
        </div>
      </footer>
    </div>
  );
}
