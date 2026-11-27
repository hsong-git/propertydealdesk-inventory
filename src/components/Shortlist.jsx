import { createContext, useContext, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { normalizeShortlist, shortlistKey, SHORTLIST_LIMIT } from "../utils/shortlist.js";
import { trackEvent } from "../utils/analytics.js";
import { useInquiryLanguage } from "./InquiryLanguage";

const KEY = "pdd-saved-properties-v1";
const Context = createContext({ keys: [], toggle: () => {}, remove: () => {}, persistent: true });
export const useShortlist = () => useContext(Context);
export function ShortlistProvider({ children }) {
  const [keys, setKeys] = useState(() => { try { return normalizeShortlist(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return []; } });
  const [persistent, setPersistent] = useState(true);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(keys)); setPersistent(true); } catch { setPersistent(false); } }, [keys]);
  useEffect(() => {
    const sync = event => { if (event.key === KEY) { try { setKeys(normalizeShortlist(JSON.parse(event.newValue || "[]"))); } catch { /* Ignore invalid external storage. */ } } };
    window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync);
  }, []);
  const remove = key => setKeys(current => current.filter(item => item !== key));
  const toggle = listing => { const key = shortlistKey(listing); if (!key) return;
    setKeys(current => current.includes(key) ? current.filter(item => item !== key) : current.length < SHORTLIST_LIMIT ? [...current, key] : current);
  };
  return <Context.Provider value={{ keys, toggle, remove, persistent }}>{children}</Context.Provider>;
}
export function SavePropertyButton({ listing, compact = false }) {
  const { keys, toggle } = useShortlist();
  const { t } = useInquiryLanguage();
  const saved = keys.includes(shortlistKey(listing));
  const full = !saved && keys.length >= SHORTLIST_LIMIT;
  return <button className={`button secondary save-property-button${compact ? " is-compact" : ""}${saved ? " is-saved" : ""}`} type="button" aria-pressed={saved} disabled={full}
    aria-label={`${t(saved ? "Remove saved property" : "Save property")} ${listing.displayCode || listing.code}`}
    title={t(full ? "Shortlist full (30 properties)" : saved ? "Remove saved property" : "Save property")}
    onClick={() => { toggle(listing); trackEvent(saved ? "shortlist_remove" : "shortlist_save", { listingCode: listing.code, intent: listing.intent }); }}>
    <Heart size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{compact ? null : <span>{t(saved ? "Saved" : "Save")}</span>}
  </button>;
}
