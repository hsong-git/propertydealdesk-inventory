import { Navigate, useParams } from "react-router-dom";
import { ListingUnavailableState } from "../components/ListingUnavailableState";
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
    <>
      <Seo
        title="Property no longer available | HS Ong Property Inventory"
        description="This property may have been sold, rented, withdrawn, or removed from HS Ong Property Inventory."
        canonical={canonical}
      />
      <ListingUnavailableState code={normalizedCode || code} error={error} />
    </>
  );
}
