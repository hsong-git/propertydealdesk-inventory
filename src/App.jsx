import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy } from "react";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { InquiryLanguageProvider } from "./components/InquiryLanguage";
import { ShortlistProvider } from "./components/Shortlist";
const SavedPropertiesPage = lazy(() => import("./pages/SavedPropertiesPage").then(module => ({ default: module.SavedPropertiesPage })));
const CataloguePage = lazy(() => import("./pages/CataloguePage").then(module => ({ default: module.CataloguePage })));

const CmiPage = lazy(() => import("./pages/CmiPage").then(module => ({ default: module.CmiPage })));
const PropertyPage = lazy(() => import("./pages/PropertyPage").then(module => ({ default: module.PropertyPage })));
const DownloadGrantPage = lazy(() => import("./pages/DownloadGrantPage").then(module => ({ default: module.DownloadGrantPage })));
const ShortListingRedirect = lazy(() => import("./pages/ShortListingRedirect").then(module => ({ default: module.ShortListingRedirect })));
const RequirementPage = lazy(() => import("./pages/RequirementPage").then(module => ({ default: module.RequirementPage })));
const RequirementsAdminPage = lazy(() => import("./pages/RequirementsAdminPage").then(module => ({ default: module.RequirementsAdminPage })));
const PhotoDownloadsAdminPage = lazy(() => import("./pages/PhotoDownloadsAdminPage").then(module => ({ default: module.PhotoDownloadsAdminPage })));
const AdminLandingPage = lazy(() => import("./pages/AdminLandingPage").then(module => ({ default: module.AdminLandingPage })));
const AnalyticsAdminPage = lazy(() => import("./pages/AnalyticsAdminPage").then(module => ({ default: module.AnalyticsAdminPage })));
const AreaPage = lazy(() => import("./pages/AreaPage").then(module => ({ default: module.AreaPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(module => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then(module => ({ default: module.ContactPage })));

export default function App() {
  return (
    <InquiryLanguageProvider><ShortlistProvider><BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="cmi" element={<CmiPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="saved" element={<SavedPropertiesPage />} />
          <Route path="catalogue/page/:page" element={<CataloguePage />} />
          <Route path="areas/:area" element={<AreaPage />} />
          <Route path="inquiries" element={<RequirementPage />} />
          <Route path="requirements" element={<Navigate to="/inquiries" replace />} />
          <Route path="admin" element={<AdminLandingPage />} />
          <Route path="admin/inquiries" element={<AdminLandingPage />} />
          <Route path="admin/photo-downloads" element={<AdminLandingPage />} />
          <Route path="admin/inquiries/manage" element={<RequirementsAdminPage />} />
          <Route path="admin/photo-downloads/audit" element={<PhotoDownloadsAdminPage />} />
          <Route path="admin/analytics" element={<AnalyticsAdminPage />} />
          <Route path="admin/requirements" element={<Navigate to="/admin" replace />} />
          <Route path="i/:code" element={<ShortListingRedirect />} />
          <Route path="property/:slug" element={<PropertyPage />} />
          <Route path="download/:grantToken" element={<DownloadGrantPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter></ShortlistProvider></InquiryLanguageProvider>
  );
}
