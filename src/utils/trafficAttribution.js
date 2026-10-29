export const ATTRIBUTION_KEY = "pdd-analytics-attribution-v1";
export const TRAFFIC_KEYS = ["src", "utm_source", "utm_medium", "utm_campaign", "utm_content"];
export function trafficLabel(value) {
  const label = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return /^[a-z0-9][a-z0-9_.-]{0,63}$/.test(label) && !/^\d{7,}$/.test(label) && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(label) ? label : "";
}
// c1-c4 are intentionally neutral public tokens. Keep their channel meaning
// internal so shared listing URLs do not advertise the attribution mechanism.
const sourceAliases = { fb: "facebook", ig: "instagram", wa: "whatsapp", tg: "telegram", c1: "whatsapp", c2: "facebook", c3: "iproperty", c4: "mudah" };
const normalizeSource = (source) => sourceAliases[source] || source;
const hostMatches = (host, domain) => host === domain || host.endsWith(`.${domain}`);
export function detectAttribution({ search = "", referrer = "", hostname = "", serverSource = "", serverMedium = "" }) {
  const params = new URLSearchParams(search);
  const source = normalizeSource(trafficLabel(params.get("utm_source")) || trafficLabel(params.get("src")));
  if (source) return {
    source, medium: trafficLabel(params.get("utm_medium")) || ({ whatsapp: "messaging", telegram: "messaging", email: "email", facebook: "social", instagram: "social" }[source] || "tagged_link"),
    campaign: trafficLabel(params.get("utm_campaign")), content: trafficLabel(params.get("utm_content")), method: "tag",
  };
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // Recognise apps only when an actual app referrer is supplied, not by device.
    const apps = { "com.whatsapp": ["whatsapp", "messaging"], "com.whatsapp.w4b": ["whatsapp", "messaging"], "com.facebook.katana": ["facebook", "social"], "com.facebook.lite": ["facebook", "social"], "com.instagram.android": ["instagram", "social"], "org.telegram.messenger": ["telegram", "messaging"], "com.google.android.googlequicksearchbox": ["google", "organic_search"] };
    if (url.protocol === "android-app:" && apps[host]) {
      const [source, medium] = apps[host];
      return { source, medium, campaign: "", content: "", method: "app_referrer" };
    }
    if (["http:", "https:"].includes(url.protocol) && host !== hostname.replace(/^www\./, "") && !["property.myeviv.com", "scmi.myeviv.com"].includes(host)) {
      let source = host, medium = "referral";
      if (hostMatches(host, "cloudflareaccess.com") || ["accounts.google.com", "login.microsoftonline.com"].includes(host)) {
        return { source: "authentication_return", medium: "authentication", campaign: "", content: "", method: "referrer" };
      }
      if (["whatsapp.com", "wa.me", "t.me", "telegram.org"].some((domain) => hostMatches(host, domain))) {
        source = hostMatches(host, "whatsapp.com") || host === "wa.me" ? "whatsapp" : "telegram";
        medium = "messaging";
      } else if (["google.com", "google.com.my", "google.co.uk", "google.com.sg", "bing.com", "duckduckgo.com", "search.yahoo.com"].some((domain) => hostMatches(host, domain))) {
        source = host.includes("google.") ? "google" : host.includes("bing.") ? "bing" : host.includes("yahoo.") ? "yahoo" : "duckduckgo";
        medium = "organic_search";
      } else {
        for (const [domain, name] of [["facebook.com", "facebook"], ["fb.com", "facebook"], ["instagram.com", "instagram"], ["tiktok.com", "tiktok"], ["linkedin.com", "linkedin"], ["t.co", "x"]]) {
          if (hostMatches(host, domain)) { source = name; medium = "social"; break; }
        }
      }
      if (trafficLabel(source)) return { source, medium, campaign: "", content: "", method: "referrer" };
    }
  } catch { /* An absent or invalid referrer carries no source evidence. */ }
  if (trafficLabel(serverSource) && trafficLabel(serverMedium)) return { source: serverSource, medium: serverMedium, campaign: "", content: "", method: "server_referrer" };
  return { source: "direct_unknown", medium: "unknown", campaign: "", content: "", method: "none" };
}

export function sessionAttribution(input, storage) {
  try {
    const saved = JSON.parse(storage?.getItem(ATTRIBUTION_KEY) || "null");
    if (saved && trafficLabel(saved.source)) return { source: trafficLabel(saved.source), medium: trafficLabel(saved.medium), campaign: trafficLabel(saved.campaign), content: trafficLabel(saved.content), method: ["tag", "referrer", "app_referrer", "server_referrer", "legacy", "none"].includes(saved.method) ? saved.method : "none" };
  } catch { /* Storage can be unavailable or stale. */ }
  let result = detectAttribution(input);
  try {
    const legacy = trafficLabel(storage?.getItem("pdd-analytics-source"));
    if (legacy && result.method === "none") result = { ...result, source: legacy, medium: "tagged_link", method: "legacy" };
    storage?.setItem(ATTRIBUTION_KEY, JSON.stringify(result));
  } catch { /* Keep reporting usable when storage is blocked. */ }
  return result;
}

export function attributionSearch(search) {
  const input = new URLSearchParams(search), output = new URLSearchParams();
  for (const key of TRAFFIC_KEYS) { const value = trafficLabel(input.get(key)); if (value) output.set(key, value); }
  const intent = input.get("intent");
  if (["WTL", "WTS"].includes(intent)) output.set("intent", intent);
  const media = input.get("media");
  if (["photos", "layout", "videos"].includes(media)) output.set("media", media);
  return output.size ? `?${output}` : "";
}

export function campaignUrl(destination, { source, medium = "", campaign = "", content = "" }) {
  const url = new URL(destination);
  if (url.protocol !== "https:" || url.username || url.password || !["property.myeviv.com", "scmi.myeviv.com"].includes(url.host) || !/^\/(?:$|i\/[A-Za-z0-9-]+\/?$|property\/[A-Za-z0-9-]+\/?$)/.test(url.pathname)) throw new Error("Use a Property or SCMI homepage or listing link.");
  if (!trafficLabel(source)) throw new Error("Enter a source using letters, numbers, underscores or hyphens.");
  for (const key of TRAFFIC_KEYS) url.searchParams.delete(key);
  for (const [key, value] of Object.entries({ utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_content: content })) {
    if (value && !trafficLabel(value)) throw new Error("Use short campaign labels without contact details or special characters.");
    if (value) url.searchParams.set(key, trafficLabel(value));
  }
  url.hash = "";
  return url.toString();
}
