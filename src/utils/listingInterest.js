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

// These channel labels are the stored equivalents of c1-c4. Only a recorded
// tag method qualifies; a natural referrer or missing method is never a tag.
export const LISTING_POSTING_CODES = {whatsapp: "c1", facebook: "c2", iproperty: "c3", mudah: "c4"};

export function listingSourceBreakdown(rows = []) {
  const tagged = Object.entries(LISTING_POSTING_CODES).map(([source, postingCode]) => ({source, postingCode, views: 0, sessions: 0}));
  const other = [];
  for (const row of rows) {
    const group = row.attribution_method === "tag" && tagged.find(item => item.source === row.source);
    if (group) {
      group.views += Number(row.views || 0);
      group.sessions += Number(row.sessions || 0);
    } else other.push(row);
  }
  return [...tagged, ...combinedListingSources(other)];
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
