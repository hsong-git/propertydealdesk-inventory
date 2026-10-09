export function InventoryBadge({ listing }) {
  const label = listing.visibility === "unlisted" ? "CMI" : "SMI";
  return <span className={`inventory-badge inventory-badge-${label.toLowerCase()}`} title={`${label} inventory`}>{label}</span>;
}
