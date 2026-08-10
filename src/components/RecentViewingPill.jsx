import { Eye, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const STORAGE_KEY = "pdd-recently-viewed-listings";
const EVENT_NAME = "pdd:recent-view";

function readRecentCodes() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((code) => typeof code === "string").slice(0, 12) : [];
  } catch { return []; }
}

export function rememberListingView(code) {
  if (typeof window === "undefined" || !code) return;
  const normalized = String(code).toUpperCase();
  const next = [normalized, ...readRecentCodes().filter((item) => item !== normalized)].slice(0, 12);
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT_NAME)); } catch { /* storage may be unavailable */ }
}

export function RecentViewingPill() {
  const location = useLocation();
  const [listings, setListings] = useState([]);
  const [recentCodes, setRecentCodes] = useState(() => typeof window === "undefined" ? [] : readRecentCodes());
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/data/inventory.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (active) setListings(Array.isArray(payload?.listings) ? payload.listings : []);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sync = () => { setRecentCodes(readRecentCodes()); setDismissed(false); };
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT_NAME, sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPublicActivity = async () => {
      try {
        const response = await fetch("/api/listing-views", { cache: "no-store" });
        const payload = response.ok ? await response.json() : null;
        const publicCodes = Array.isArray(payload?.events) ? payload.events.map((event) => String(event.listing_code || "").toUpperCase()).filter(Boolean) : [];
        if (active && publicCodes.length) setRecentCodes((current) => [...new Set([...publicCodes, ...current])].slice(0, 12));
      } catch { /* Shared activity is optional until the D1 migration is applied. */ }
    };
    loadPublicActivity();
    const timer = window.setInterval(loadPublicActivity, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const recentListings = useMemo(() => recentCodes.map((code) => listings.find((item) => String(item.code).toUpperCase() === code)).filter(Boolean), [recentCodes, listings]);
  const current = recentListings[index % Math.max(recentListings.length, 1)];
  useEffect(() => {
    if (!current || dismissed) return undefined;
    setLeaving(false);
    setVisible(true);
    const hide = window.setTimeout(() => setLeaving(true), 6000);
    const next = window.setTimeout(() => setIndex((value) => value + 1), 8000);
    return () => { window.clearTimeout(hide); window.clearTimeout(next); };
  }, [current, dismissed, index]);

  if (!current || location.pathname.startsWith("/admin") || location.pathname === "/inquiries" || !visible) return null;
  return <aside className={`recent-viewing-pill${leaving ? " is-leaving" : ""}`} role="status">
    <Link to={`/property/${current.slug}`} aria-label={`Open recently viewed listing ${current.code}`}><Eye size={16} /><span><strong>{current.code}</strong> — {current.title} was recently viewed</span></Link>
    <button type="button" onClick={() => { setDismissed(true); setLeaving(true); window.setTimeout(() => setVisible(false), 2000); }} aria-label="Dismiss recently viewed notice"><X size={15} /></button>
  </aside>;
}
