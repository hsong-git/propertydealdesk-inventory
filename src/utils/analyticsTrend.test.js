import test from "node:test";
import assert from "node:assert/strict";
import { analyticsTrend } from "./analyticsTrend.js";
import { analyticsPeriod } from "../../functions/_lib/analyticsPeriod.js";

test("Malaysia reporting period contains exactly N dates including the current partial day", () => {
  const period = analyticsPeriod(7, new Date("2026-10-23T18:30:00Z"));
  assert.equal(period.startDay, "2026-10-18");
  assert.equal(period.endDay, "2026-10-24");
  assert.equal(period.start, "2026-10-17T16:00:00.000Z");
  assert.equal(period.end, "2026-10-23T18:30:00.000Z");
  assert.equal(analyticsTrend([], period).length, 7);
});

test("daily trends fill missing dates and calculate rates without dividing by zero", () => {
  const points = analyticsTrend([{ day: "2026-10-22", sessions: 20, listing_views: 30, whatsapp_clicks: 2, inquiries: 1 }], { startDay: "2026-10-22", endDay: "2026-10-24" });
  assert.equal(points.length, 3);
  assert.equal(points[0].inquiry_rate, 5);
  assert.equal(points[0].listing_views, 30);
  assert.deepEqual(points[1], { day: "2026-10-23", sessions: 0, inquiries: 0, listing_views: 0, whatsapp_clicks: 0, inquiry_rate: 0 });
});
