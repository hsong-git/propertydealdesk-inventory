import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Seo } from "../components/Seo";
import { useInventory } from "../hooks";
import { SITE_ORIGIN } from "../utils/seo";

export function ShortListingRedirect() {
  const { code = "" } = useParams();
  const normalizedCode = code.toUpperCase();
  const { items, loading, error } = useInventory();
  const listing = items.find((item) => item.code === normalizedCode);

  if (listing) return <Navigate to={`/property/${listing.slug}`} replace />;

  const canonical = `${SITE_ORIGIN}/i/${encodeURIComponent(normalizedCode || code)}`;
  if (loading) {
    return (
      <main className="page-width page-state">
        <Seo title="Loading property shortcut | HS Ong Property Inventory" canonical={canonical} />
        <strong>Loading property shortcut…</strong>
      </main>
    );
  }

  return (
    <main className="page-width page-state">
      <Seo
        title="Property shortcut not found | HS Ong Property Inventory"
        description="This short property link may no longer be in the public HS Ong Property Inventory."
        canonical={canonical}
      />
      <strong>Property shortcut not found</strong>
      <p>{error || "This listing may no longer be in the public inventory."}</p>
      <Link className="button secondary" to="/"><ArrowLeft size={18} /> Back to Catalogue</Link>
    </main>
  );
}
