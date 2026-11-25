import { Component, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

class PageLoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="page-width page-state"><h1>This page could not load</h1><p>Your connection or the website version may have changed. Please reload to try again.</p><button className="button primary" type="button" onClick={() => window.location.reload()}>Reload page</button></main>;
    return this.props.children;
  }
}

export function RouteContent() {
  const { pathname } = useLocation();
  return <PageLoadBoundary key={pathname}><Suspense fallback={<main className="page-width page-state" role="status">Loading page…</main>}><Outlet /></Suspense></PageLoadBoundary>;
}
