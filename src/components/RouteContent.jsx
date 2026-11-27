import { useSiteLanguage } from "./InquiryLanguage";
import { Component, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

function PageLoadError() {
  const { t: tSite } = useSiteLanguage();
  return <main className="page-width page-state"><h1>{tSite("This page could not load")}</h1><p>{tSite("Your connection or the website version may have changed. Please reload to try again.")}</p><button className="button primary" type="button" onClick={() => window.location.reload()}>{tSite("Reload page")}</button></main>;
}

class PageLoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <PageLoadError />;
    return this.props.children;
  }
}

export function RouteContent() {
  const { t: tSite } = useSiteLanguage();
  const { pathname } = useLocation();
  return <PageLoadBoundary key={pathname}><Suspense fallback={<main className="page-width page-state" role="status">{tSite("Loading page…")}</main>}><Outlet /></Suspense></PageLoadBoundary>;
}
