import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { onRequestGet } from "./analytics.js";
import { detectAttribution } from "../../../src/utils/trafficAttribution.js";

test("posting report includes c1-c4 tagged journeys on each site but excludes natural referrals and old events", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY,site_host TEXT,event_name TEXT,occurred_at TEXT,session_id TEXT,source TEXT,listing_code TEXT,properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events(site_host,event_name,occurred_at,session_id,source,listing_code,properties_json) VALUES (?,?,?,?,?,'WTL0070',?)");
    const now = new Date(Date.now()-1000).toISOString();
    const mapping = {c1:"whatsapp",c2:"facebook",c3:"iproperty",c4:"mudah"};
    for (const host of ["property.myeviv.com","scmi.myeviv.com"]) {
      for (const [token,source] of Object.entries(mapping)) {
        const attribution = detectAttribution({search:`?src=${token}`});
        assert.equal(attribution.source,source);
        const props = JSON.stringify({traffic_method:attribution.method});
        insert.run(host,"listing_view",now,token,"","{}");
        for (const event of ["listing_view","whatsapp_click","inquiry_submitted"]) insert.run(host,event,now,token,source,props);
        insert.run(host,"listing_view",now,`natural-${token}`,source,JSON.stringify({traffic_method:"referrer"}));
        insert.run(host,"listing_view","2000-01-01T00:00:00.000Z",`old-${token}`,source,props);
      }
    }
    const db = {prepare(sql) {return {bind(...params) {return {async all() {return {results:sqlite.prepare(sql).all(...params)};}};}};}};
    for (const days of [7,30,90]) {
      const response = await onRequestGet({request:new Request(`http://localhost/api/admin/analytics?days=${days}`),env:{REQUIREMENTS_DB:db}});
      assert.equal(response.status,200);
      const data = await response.json();
      assert.equal(data.postingTracking.length,8);
      for (const host of ["property.myeviv.com","scmi.myeviv.com"]) for (const source of Object.values(mapping)) {
        const row = data.postingTracking.find(row=>row.site_host===host && row.source===source);
        assert.equal(row.sessions,1); assert.equal(row.listing_views,2);
        assert.equal(row.whatsapp_clicks,1); assert.equal(row.inquiries,1);
        assert.equal(row.tagged_sessions,1); assert.equal(row.referrer_sessions,0);
        const daily = data.postingDaily.filter(row=>row.site_host===host && row.source===source);
        assert.equal(daily.length,1);
        for (const metric of ["sessions","listing_views","whatsapp_clicks","inquiries"]) assert.equal(daily[0][metric],row[metric]);
        assert.equal(data.sources.find(row=>row.site_host===host && row.source===source).sessions,2);
      }
    }
  } finally {sqlite.close();}
});

test("posting daily trends use Malaysia days, distinct daily sessions and the same period attribution", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY,site_host TEXT,event_name TEXT,occurred_at TEXT,session_id TEXT,source TEXT,listing_code TEXT,properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events(site_host,event_name,occurred_at,session_id,source,listing_code,properties_json) VALUES (?,?,?,?,?,'WTL0070',?)");
    const today = new Date(Date.now()+8*3600000).toISOString().slice(0,10);
    const boundary = Date.parse(`${today}T00:00:00+08:00`)-86400000;
    const add = (host,event,session,source,offset,method="tag") => insert.run(host,event,new Date(boundary+offset).toISOString(),session,source,JSON.stringify({traffic_method:method}));
    for (const host of ["property.myeviv.com","scmi.myeviv.com"]) for (const source of ["whatsapp","facebook","iproperty","mudah"]) {
      add(host,"listing_view",source,"",-1000,"");
      add(host,"listing_view",source,source,1000);
      add(host,"whatsapp_click",source,source,2000);
      add(host,"inquiry_submitted",source,source,3000);
      add(host,"listing_view",`${source}-second`,source,4000);
      add(host,"listing_view",`${source}-natural`,source,4000,"referrer");
      add(host,"listing_view",`${source}-old`,source,-100*86400000);
      add(host,"listing_view",`${source}-future`,source,100*86400000);
    }
    const db = {prepare(sql) {return {bind(...params) {return {async all() {return {results:sqlite.prepare(sql).all(...params)};}};}};}};
    for (const days of [7,30,90]) {
      const data = await (await onRequestGet({request:new Request(`http://localhost/api/admin/analytics?days=${days}`),env:{REQUIREMENTS_DB:db}})).json();
      assert.equal(data.postingDaily.length,16);
      for (const total of data.postingTracking) {
        const rows = data.postingDaily.filter(r=>r.site_host===total.site_host && r.source===total.source);
        assert.deepEqual(rows.map(r=>[r.day,r.sessions,r.listing_views,r.whatsapp_clicks,r.inquiries]),[
          [new Date(boundary-1000+8*3600000).toISOString().slice(0,10),1,1,0,0],
          [new Date(boundary+8*3600000).toISOString().slice(0,10),2,2,1,1],
        ]);
        assert.equal(total.sessions,2);
        for (const metric of ["listing_views","whatsapp_clicks","inquiries"]) assert.equal(rows.reduce((sum,r)=>sum+r[metric],0),total[metric]);
      }
      assert.ok(data.postingDaily.every(r=>!Object.hasOwn(r,"session_id")));
    }
  } finally {sqlite.close();}
});

test("listing interest counts actions without join inflation and keeps inquiries as later session journeys", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY,site_host TEXT,event_name TEXT,occurred_at TEXT,session_id TEXT,source TEXT,listing_code TEXT,properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events(site_host,event_name,occurred_at,session_id,source,listing_code,properties_json) VALUES (?,?,?,?,'',?,?)");
    const base = Date.now() - 60000;
    const add = (event, session, seconds, code="WTL0070", props={}, host="property.myeviv.com") => insert.run(host,event,new Date(base+seconds*1000).toISOString(),session,code,JSON.stringify(props));
    add("listing_view","a",1); add("listing_view","a",2);
    add("whatsapp_click","a",3); add("whatsapp_click","a",4);
    add("photo_view","a",5); add("media_open","a",6,"WTL0070",{media:"layout"});
    add("media_open","a",7,"WTL0070",{media:"videos"});
    add("photo_share","a",8); add("copy_posting","a",9); add("share_property","a",10);
    add("inquiry_submitted","a",11,""); add("inquiry_submitted","a",12,"");
    add("listing_view","b",1);
    add("inquiry_submitted","c",1,""); add("listing_view","c",3);
    add("whatsapp_click","c",4,"WTL0079"); // Another listing is not engagement with WTL0070.
    add("whatsapp_click","card-only",4); // Clicks from catalogue cards need not have a detail view.
    add("listing_view","a",1,"WTL0070",{},"scmi.myeviv.com");
    add("listing_view","old",-86400*100); add("whatsapp_click","old",-86400*100);
    add("listing_view","future",86400);
    const db = {prepare(sql) { return {bind(...params) { return {async all() {return {results:sqlite.prepare(sql).all(...params)};}};}};}};
    const data = await (await onRequestGet({request:new Request("http://localhost/api/admin/analytics?days=7"),env:{REQUIREMENTS_DB:db}})).json();
    const row = data.listingInterest.find(row=>row.site_host==="property.myeviv.com");
    assert.deepEqual(row,{site_host:"property.myeviv.com",listing_code:"WTL0070",whatsapp_clicks:3,photo_opens:1,layout_opens:1,video_opens:1,photo_shares:1,posting_copies:1,property_shares:1,viewing_sessions:3,repeat_view_sessions:1,contact_sessions:1,inquiry_sessions:1,engaged_sessions:1,no_action_sessions:2});
    const scmi = data.listingInterest.find(row=>row.site_host==="scmi.myeviv.com");
    assert.equal(scmi.whatsapp_clicks,0); assert.equal(scmi.inquiry_sessions,0); assert.equal(scmi.no_action_sessions,1);
    assert.equal(data.listingInterest.length,2); // No detail view for WTL0079.
    assert.ok(data.listingInterest.every(row=>!Object.hasOwn(row,"session_id")));
  } finally {sqlite.close();}
});

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
    assert.deepEqual(data.postingTracking.map(({site_host,source,sessions,listing_views,whatsapp_clicks,inquiries})=>({site_host,source,sessions,listing_views,whatsapp_clicks,inquiries})), [
      {site_host:"property.myeviv.com",source:"whatsapp",sessions:1,listing_views:2,whatsapp_clicks:1,inquiries:1},
    ]);
    assert.equal(data.campaigns.length,1);
    assert.equal(data.campaigns[0].campaign,"october_rentals");
    assert.equal(data.campaigns[0].whatsapp_clicks,1);
    assert.deepEqual(data.listingSources.filter(row=>row.site_host==="property.myeviv.com").map(({source,views,sessions})=>({source,views,sessions})), [
      {source:"facebook",views:2,sessions:1}, {source:"whatsapp",views:2,sessions:1},
    ]);
    assert.equal(data.cloudflareSnapshots[0].site_host, "property.myeviv.com");
    assert.equal(data.cloudflareSnapshots[0].rows.reduce((sum, row) => sum + row.visits, 0), data.cloudflareSnapshots[0].totalVisits);
  } finally {sqlite.close();}
});

test("listing sources reconcile with totals, reuse session attribution and isolate sites and periods", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("CREATE TABLE analytics_events (id INTEGER PRIMARY KEY,site_host TEXT,event_name TEXT,occurred_at TEXT,session_id TEXT,source TEXT,listing_code TEXT,properties_json TEXT DEFAULT '{}')");
    const insert = sqlite.prepare("INSERT INTO analytics_events(site_host,event_name,occurred_at,session_id,source,listing_code) VALUES (?,?,?,?,?,?)");
    const now = new Date(Date.now()-1000).toISOString();
    const add = (event, session, source, code, host="property.myeviv.com", at=now) => insert.run(host,event,at,session,source,code);
    add("catalogue_view","a","facebook","");
    add("listing_view","a","","WTL0070");
    add("listing_view","a","","WTL0070");
    add("listing_view","a","","WTL0079");
    add("listing_view","b","","WTL0070");
    add("listing_view","c","direct_unknown","WTL0070");
    add("listing_view","a","google","WTL0070","scmi.myeviv.com");
    add("listing_view","old","facebook","WTL0070","property.myeviv.com","2000-01-01T00:00:00.000Z");
    const db = { prepare(sql) { return { bind(...params) { return { async all() { return {results:sqlite.prepare(sql).all(...params)}; } }; } }; } };
    const data = await (await onRequestGet({request:new Request("http://localhost/api/admin/analytics?days=7"),env:{REQUIREMENTS_DB:db}})).json();
    for (const listing of data.listings) {
      const sources = data.listingSources.filter(row=>row.site_host===listing.site_host && row.listing_code===listing.listing_code);
      assert.equal(sources.reduce((sum,row)=>sum+row.views,0),listing.views);
      assert.equal(sources.reduce((sum,row)=>sum+row.sessions,0),listing.sessions);
    }
    assert.equal(data.listingSources.find(row=>row.listing_code==="WTL0079").source,"facebook");
    const rows = data.listingSources.filter(row=>row.site_host==="property.myeviv.com" && row.listing_code==="WTL0070");
    assert.deepEqual(rows.map(({source,views,sessions})=>({source,views,sessions})),[
      {source:"facebook",views:2,sessions:1},
      {source:"direct_unknown",views:1,sessions:1},
      {source:"unattributed",views:1,sessions:1},
    ]);
    assert.equal(data.listingSources.find(row=>row.site_host==="scmi.myeviv.com").source,"google");
    assert.ok(data.listingSources.every(row=>!Object.hasOwn(row,"session_id")));
  } finally {sqlite.close();}
});
