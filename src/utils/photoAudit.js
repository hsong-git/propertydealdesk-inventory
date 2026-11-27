const timestamp = (event) => Date.parse(event.shared_at) || 0;

export function groupPhotoAudit(events, sort = "latest") {
  const groups = new Map();
  for (const event of events) {
    const key = event.anonymous_browser_id || "unrecorded";
    if (!groups.has(key)) groups.set(key, { key, browserId: event.anonymous_browser_id || "", events: [] });
    groups.get(key).events.push(event);
  }
  const result = [...groups.values()].map((group) => {
    group.events.sort((a, b) => (sort === "oldest" ? 1 : -1) * (timestamp(a) - timestamp(b)) || String(a.id).localeCompare(String(b.id)));
    return { ...group, count: group.events.length,
      photoCount: group.events.reduce((total, event) => total + (Number(event.photo_count) || 0), 0),
      listingCount: new Set(group.events.map((event) => event.listing_code).filter(Boolean)).size,
      latest: Math.max(...group.events.map(timestamp)), earliest: Math.min(...group.events.map(timestamp)) };
  });
  return result.sort((a, b) => {
    const order = sort === "oldest" ? a.earliest - b.earliest
      : sort === "events" ? b.count - a.count
      : sort === "photos" ? b.photoCount - a.photoCount
      : sort === "browser" ? (a.browserId && b.browserId ? a.browserId.localeCompare(b.browserId) : Number(!a.browserId) - Number(!b.browserId))
      : b.latest - a.latest;
    return order || b.latest - a.latest || a.key.localeCompare(b.key);
  });
}
