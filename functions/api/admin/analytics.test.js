import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { onRequestGet } from "./analytics.js";

test("daily reporting counts events and distinct sessions per Malaysia day and site", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY, site_host TEXT, event_name TEXT, occurred_at TEXT, session_id TEXT, source TEXT, listing_code TEXT, properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events (site_host,event_name,occurred_at,session_id,source,listing_code) VALUES (?, ?, ?, ?, '', 'WTL0070')");
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
    assert.equal(data.sources.find((row) => row.site_host === "property.myeviv.com").sessions, 2);
  } finally { sqlite.close(); }
});

test("source and campaign reports include listing-only sessions and attribute conversions once", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY, site_host TEXT,event_name TEXT,occurred_at TEXT,session_id TEXT,source TEXT,listing_code TEXT,properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events(site_host,event_name,occurred_at,session_id,source,listing_code,properties_json) VALUES (?,?,?,?,?,'WTL0070',?)");
    const now = new Date(Date.now() - 1000).toISOString();
    const props = JSON.stringify({traffic_medium:"messaging",traffic_campaign:"october_rentals",traffic_content:"agents_group",traffic_method:"tag"});
    for (const event of ["listing_view", "listing_view", "whatsapp_click", "inquiry_submitted"]) insert.run("property.myeviv.com",event,now,"tagged", "whatsapp",props);
    insert.run("property.myeviv.com","listing_view",now,"legacy", "", "{}");
    insert.run("property.myeviv.com","listing_view",now,"legacy", "facebook", "{}");
    insert.run("scmi.myeviv.com","listing_view",now,"tagged", "google", "{}");
    const db = { prepare(sql) { return { bind(...params) { return { async all() { return {results:sqlite.prepare(sql).all(...params)}; } }; } }; } };
    const data = await (await onRequestGet({request:new Request("http://localhost/api/admin/analytics?days=30"),env:{REQUIREMENTS_DB:db}})).json();
    const rows = data.sources.filter(row=>row.site_host==="property.myeviv.com");
    assert.equal(rows.reduce((sum,row)=>sum+row.sessions,0),2);
    assert.equal(rows.find(row=>row.source==="whatsapp").listing_views,2);
    assert.equal(rows.find(row=>row.source==="whatsapp").inquiries,1);
    assert.equal(rows.find(row=>row.source==="whatsapp").tagged_sessions,1);
    assert.equal(rows.find(row=>row.source==="whatsapp").referrer_sessions,0);
    assert.equal(rows.find(row=>row.source==="facebook").sessions,1);
    assert.equal(data.campaigns.length,1);
    assert.equal(data.campaigns[0].campaign,"october_rentals");
    assert.equal(data.campaigns[0].whatsapp_clicks,1);
    assert.equal(data.cloudflareSnapshots[0].site_host, "property.myeviv.com");
    assert.equal(data.cloudflareSnapshots[0].rows.reduce((sum, row) => sum + row.visits, 0), data.cloudflareSnapshots[0].totalVisits);
  } finally {sqlite.close();}
});
