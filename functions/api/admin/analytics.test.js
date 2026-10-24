import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { onRequestGet } from "./analytics.js";

test("daily reporting counts events and distinct sessions per Malaysia day and site", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (site_host TEXT, event_name TEXT, occurred_at TEXT, session_id TEXT, source TEXT, listing_code TEXT)");
    const insert = sqlite.prepare("INSERT INTO analytics_events VALUES (?, ?, ?, ?, '', 'WTL0070')");
    const now = new Date();
    const day = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
    const early = new Date(Date.parse(`${day}T00:00:00Z`) - 8 * 3600000).toISOString();
    for (const event of ["listing_view", "listing_view", "whatsapp_click", "inquiry_submitted"]) insert.run("property.myeviv.com", event, early, "session-a");
    insert.run("property.myeviv.com", "catalogue_view", early, "session-b");
    insert.run("scmi.myeviv.com", "listing_view", early, "session-a");
    insert.run("property.myeviv.com", "listing_view", "2000-01-01T00:00:00.000Z", "old");
    const db = { prepare(sql) { return { bind(...params) { return { async all() { return { results: sqlite.prepare(sql).all(...params) }; } }; } }; } };
    const response = await onRequestGet({ request: new Request("http://localhost/api/admin/analytics?days=7"), env: { REQUIREMENTS_DB: db } });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.period.timezone, "Asia/Kuala_Lumpur");
    assert.deepEqual(data.daily.find((row) => row.site_host === "property.myeviv.com"), { day, site_host: "property.myeviv.com", sessions: 2, listing_views: 2, whatsapp_clicks: 1, inquiries: 1 });
    assert.equal(data.daily.find((row) => row.site_host === "scmi.myeviv.com").sessions, 1);
    assert.equal(data.summary.find((row) => row.site_host === "property.myeviv.com").sessions, 2);
  } finally { sqlite.close(); }
});
