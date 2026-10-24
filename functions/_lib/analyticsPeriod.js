export function analyticsPeriod(days, now = new Date()) {
  const endDay = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const startDay = new Date(Date.parse(`${endDay}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { startDay, endDay, timezone: "Asia/Kuala_Lumpur", start: new Date(Date.parse(`${startDay}T00:00:00Z`) - 8 * 3600000).toISOString(), end: now.toISOString() };
}
