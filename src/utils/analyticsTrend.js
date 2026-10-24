export function analyticsTrend(rows, period) {
  if (!period?.startDay || !period?.endDay) return [];
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const result = [];
  for (let time = Date.parse(`${period.startDay}T00:00:00Z`); time <= Date.parse(`${period.endDay}T00:00:00Z`); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    const row = byDay.get(day) || {};
    const sessions = Number(row.sessions || 0), inquiries = Number(row.inquiries || 0);
    result.push({ day, sessions, inquiries, listing_views: Number(row.listing_views || 0), whatsapp_clicks: Number(row.whatsapp_clicks || 0), inquiry_rate: sessions ? inquiries / sessions * 100 : 0 });
  }
  return result;
}
