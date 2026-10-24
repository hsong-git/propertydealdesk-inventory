import { sessionAttribution } from "./trafficAttribution.js";

const ENDPOINT = "/api/analytics/event";
const SESSION_KEY = "pdd-analytics-session";
let attribution;

function randomId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export function analyticsSource() {
  return analyticsAttribution()?.source || "";
}

export function analyticsAttribution() {
  if (typeof window === "undefined") return null;
  if (!attribution) {
    let storage;
    try { storage = window.sessionStorage; } catch { /* Use in-memory attribution. */ }
    attribution = sessionAttribution({ search: window.location.search, hostname: window.location.hostname, referrer: document.referrer,
      serverSource: document.querySelector('meta[name="pdd-entry-source"]')?.content || "",
      serverMedium: document.querySelector('meta[name="pdd-entry-medium"]')?.content || "",
    }, storage);
  }
  return attribution;
}

export function trackEvent(eventName, details = {}) {
  if (typeof window === "undefined" || !eventName) return;
  const payload = {
    eventName,
    sessionId: safeSessionId(),
    source: analyticsSource(),
    attribution: analyticsAttribution(),
    pagePath: window.location.pathname,
    listingCode: details.listingCode || "",
    intent: details.intent || "",
    properties: details.properties || {},
  };
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
    fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* Analytics must never interrupt the visitor experience. */ }
}
