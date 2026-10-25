export function combinedListingSources(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const source = !row.source || ["unattributed", "Unattributed", "direct_unknown"].includes(row.source) ? "unknown" : row.source;
    const group = groups.get(source) || {source, views: 0, sessions: 0};
    group.views += Number(row.views || 0); group.sessions += Number(row.sessions || 0);
    groups.set(source, group);
  }
  return [...groups.values()].sort((a,b) => (a.source === "unknown") - (b.source === "unknown") || b.sessions - a.sessions);
}

export function listingInterestSummary(interest) {
  if (!interest) return "Interest details are unavailable. Refresh to try again.";
  const sessions = Number(interest.viewing_sessions || 0);
  const contacted = Number(interest.contact_sessions || 0);
  if (contacted) return `${contacted} of ${sessions} viewing sessions clicked WhatsApp (${(contacted / sessions * 100).toFixed(1)}%).`;
  if (Number(interest.inquiry_sessions)) return "An inquiry followed a viewing session; no WhatsApp click was recorded for this listing.";
  if (Number(interest.engaged_sessions)) return "This listing attracted exploration or sharing, but no contact action was recorded after viewing.";
  return "Views were recorded, but no further tracked action followed.";
}
