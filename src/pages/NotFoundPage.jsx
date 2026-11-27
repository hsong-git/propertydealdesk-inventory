import { useSiteLanguage } from "../components/InquiryLanguage";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  const { t: tSite } = useSiteLanguage();
  return <main className="page-width page-state"><strong>{tSite("Page not found")}</strong><p>{tSite("The page you requested is not part of this public catalogue.")}</p><Link className="button secondary" to="/"><ArrowLeft size={18} />{tSite(" Back to Catalogue")}</Link></main>;
}
