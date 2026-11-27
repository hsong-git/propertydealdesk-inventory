import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useInventory } from "../hooks";
import { useInquiryLanguage } from "../components/InquiryLanguage";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { NotFoundPage } from "./NotFoundPage";
import { COMBINED_CATALOGUE, CATALOGUE_ORIGIN } from "../config/catalogueSite.js";
import { compareNewlyAdded } from "../utils/listing.js";

// The generated HTML remains crawlable without JavaScript. This route adds the
// same language and save controls when a person uses the paginated catalogue.
export function CataloguePage() {
  const { page: rawPage } = useParams(); const page = Number(rawPage);
  const { items, loading, error } = useInventory(); const { t } = useInquiryLanguage();
  const pages = Math.max(1, Math.ceil(items.length / 12));
  const sortedItems = [...items].sort(compareNewlyAdded);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  if (!Number.isInteger(page) || page < 1 || !loading && !error && page > pages) return <NotFoundPage />;
  return <main className="page-width home-stack saved-properties-page"><Seo title={`Property Catalogue — Page ${page} | HS Ong`} canonical={`${CATALOGUE_ORIGIN}/catalogue/page/${page}/`} robots={COMBINED_CATALOGUE ? "index, follow" : "noindex, follow"} />
    <Link className="back-link" to="/">{t("Back to Catalogue")}</Link>
    <header><h1>{t("Catalogue page {page}", { page })}</h1><p>{items.length} {t("properties")}</p></header>
    {loading ? <p role="status">{t("Loading public inventory…")}</p> : error ? <p role="alert">{t("Unable to load current listings. Please refresh or contact HS Ong.")}</p> : <>
      <div className="property-grid">{sortedItems.slice((page - 1) * 12, page * 12).map(listing => <PropertyCard listing={listing} key={listing.publicId} />)}</div>
      <nav className="catalogue-pagination" aria-label={t("Catalogue pages")}>{Array.from({length:pages}, (_, index) => <Link className={`button ${index + 1 === page ? "primary" : "secondary"}`} key={index} to={`/catalogue/page/${index + 1}/`} aria-current={index + 1 === page ? "page" : undefined}>{index + 1}</Link>)}</nav>
    </>}
  </main>;
}
