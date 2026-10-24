import { detectAttribution } from "../../src/utils/trafficAttribution.js";

const ACCOUNT = "3875db6c85889be41a227aec1e74777e";
const SITE = "1714bc0e4faf42ffb77bd003bdb25dac";
const HOSTS = new Set(["property.myeviv.com", "scmi.myeviv.com"]);

export async function readCloudflareSources({ token, host, period, days, fetcher = fetch }) {
  if (!token || !HOSTS.has(host)) throw new Error("Cloudflare analytics access is not configured.");
  const start = Date.parse(period.start), end = Date.parse(period.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start > 91 * 86400000) throw new Error("Invalid Cloudflare analytics period.");
  const referrers = new Map();
  let limited = false;
  // Keep each API query within a 30-day window, including for 90-day reports.
  for (let from = start; from <= end; from += 30 * 86400000) {
    const to = Math.min(end, from + 30 * 86400000 - 1);
    const query = `{ viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      rumPageloadEventsAdaptiveGroups(limit: 1000, filter: {
        siteTag: "${SITE}", requestHost: "${host}", bot: 0,
        datetime_geq: "${new Date(from).toISOString()}", datetime_leq: "${new Date(to).toISOString()}"
      }) { dimensions { refererHost } sum { visits } }
    } } }`;
    const response = await fetcher("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Cloudflare analytics request failed.");
    const payload = await response.json();
    const groups = payload?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups;
    if (payload.errors?.length || !Array.isArray(groups)) throw new Error("Cloudflare analytics data is unavailable for this account.");
    limited ||= groups.length >= 1000;
    for (const group of groups) {
      const visits = Number(group.sum?.visits);
      const host = String(group.dimensions?.refererHost || "").slice(0, 253).toLowerCase();
      if (Number.isFinite(visits) && visits > 0) referrers.set(host, (referrers.get(host) || 0) + visits);
    }
  }
  const grouped = new Map();
  for (const [referrer, visits] of referrers) {
    const classified = referrer ? detectAttribution({ referrer: `https://${referrer}/`, hostname: host }) : { source: "direct_unknown" };
    const source = classified.source;
    const row = grouped.get(source) || { source, visits: 0, referrers: [] };
    row.visits += visits;
    row.referrers.push(`${referrer || "None (direct)"}: ${visits}`);
    grouped.set(source, row);
  }
  const rows = [...grouped.values()].sort((a, b) => b.visits - a.visits).map(row => ({ ...row, referrers: row.referrers.join("; ") }));
  return {
    site_host: host, days, period, capturedAt: new Date().toISOString(), mode: "live", estimated: true, limited, excludeBots: true,
    totalVisits: rows.reduce((sum, row) => sum + row.visits, 0), rows,
    reportUrl: `https://dash.cloudflare.com/${ACCOUNT}/web-analytics/overview/visits?siteTag~in=${SITE}&excludeBots=Yes&host=${host}&time-window=${days * 1440}`,
  };
}
