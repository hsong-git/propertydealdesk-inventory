import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminBackLink() {
  return <Link className="button secondary admin-back-link" to="/admin"><ArrowLeft size={16} aria-hidden="true" /> Back to Administration</Link>;
}
