import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PropertyPage } from "./pages/PropertyPage";
import { DownloadGrantPage } from "./pages/DownloadGrantPage";
import { ShortListingRedirect } from "./pages/ShortListingRedirect";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="i/:code" element={<ShortListingRedirect />} />
          <Route path="property/:slug" element={<PropertyPage />} />
          <Route path="download/:grantToken" element={<DownloadGrantPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
