import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <main className="page-width page-state"><strong>Page not found</strong><p>The page you requested is not part of this public catalogue.</p><Link className="button secondary" to="/"><ArrowLeft size={18} /> Back to Catalogue</Link></main>;
}
