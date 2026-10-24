const count = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
const key = source => !source || ["direct_unknown", "unattributed", "Unattributed"].includes(source) ? "unknown" : source;

// Normalize proportions only. Cloudflare visits and tab sessions are not
// interchangeable, and aggregate visits cannot be allocated to lead records.
export function normalizedTrafficSources(sources = [], cloudflare = null) {
  const rows = new Map();
  const get = source => {
    const normalized = key(source);
    if (!rows.has(normalized)) rows.set(normalized, {source:normalized,sessions:0,visits:0,views:0,whatsappClicks:0,inquiries:0});
    return rows.get(normalized);
  };
  let sessionTotal = 0;
  for (const input of sources) {
    const row = get(input.source), sessions = count(input.sessions);
    sessionTotal += sessions;row.sessions += sessions;
    row.views += count(input.listing_views);row.whatsappClicks += count(input.whatsapp_clicks);row.inquiries += count(input.inquiries);
  }
  let visitTotal = 0;
  for (const input of cloudflare?.rows || []) {
    const row = get(input.source), visits = count(input.visits);
    visitTotal += visits;row.visits += visits;
  }
  return {
    sessionTotal,visitTotal,
    rows:[...rows.values()].map(row => ({...row,
      sessionPercent:sessionTotal ? row.sessions/sessionTotal*100 : null,
      visitPercent:cloudflare && visitTotal ? row.visits/visitTotal*100 : null,
    })).sort((a,b) => (a.source === "unknown") - (b.source === "unknown") || Math.max(b.sessionPercent || 0,b.visitPercent || 0)-Math.max(a.sessionPercent || 0,a.visitPercent || 0)),
  };
}

export function simpleTrafficSources(sources = [], cloudflare = null) {
  const normalized = normalizedTrafficSources(sources, cloudflare);
  const useCloudflare = Boolean(cloudflare) && (normalized.visitTotal > 0 || normalized.sessionTotal === 0);
  return {
    dataset: useCloudflare ? "cloudflare" : "website",
    total: useCloudflare ? normalized.visitTotal : normalized.sessionTotal,
    rows: normalized.rows.map(row => ({source:row.source,count:useCloudflare ? row.visits : row.sessions,percent:useCloudflare ? row.visitPercent : row.sessionPercent})).filter(row=>row.count>0),
    whatsappClicks: normalized.rows.reduce((sum,row)=>sum+row.whatsappClicks,0),
    inquiries: normalized.rows.reduce((sum,row)=>sum+row.inquiries,0),
  };
}
