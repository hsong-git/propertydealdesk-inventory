const ENDPOINT = "/api/analytics/event";
const SESSION_KEY = "pdd-analytics-session";
const SOURCE_KEY = "pdd-analytics-source";
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

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
  if (typeof window === "undefined") return "";
  try {
    const requested = new URLSearchParams(window.location.search).get("src")?.trim() || "";
    if (SOURCE_PATTERN.test(requested)) window.sessionStorage.setItem(SOURCE_KEY, requested.toLowerCase());
    return window.sessionStorage.getItem(SOURCE_KEY) || "";
  } catch {
    return "";
  }
}

export function trackEvent(eventName, details = {}) {
  if (typeof window === "undefined" || !eventName) return;
  const payload = {
    eventName,
    sessionId: safeSessionId(),
    source: analyticsSource(),
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

