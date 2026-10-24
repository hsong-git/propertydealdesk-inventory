import assert from "node:assert/strict";
import test from "node:test";
import { normalizedTrafficSources, simpleTrafficSources } from "./normalizedTrafficSources.js";

test("normalizes each dataset independently and retains lead ownership",()=>{
  const data=normalizedTrafficSources([{source:"facebook",sessions:2,listing_views:5,whatsapp_clicks:1,inquiries:1},{source:"unattributed",sessions:6},{source:"direct_unknown",sessions:2}],{rows:[{source:"facebook",visits:310},{source:"direct_unknown",visits:580}]});
  assert.equal(data.sessionTotal,10);assert.equal(data.visitTotal,890);
  const facebook=data.rows.find(row=>row.source==="facebook");
  assert.equal(facebook.sessionPercent,20);assert.ok(Math.abs(facebook.visitPercent-34.83146)<0.001);assert.equal(facebook.inquiries,1);
  const unknown=data.rows.find(row=>row.source==="unknown");assert.equal(unknown.sessions,8);assert.equal(unknown.visits,580);
  assert.equal(data.rows.reduce((sum,row)=>sum+row.sessionPercent,0),100);
  assert.ok(Math.abs(data.rows.reduce((sum,row)=>sum+row.visitPercent,0)-100)<0.0001);
});
test("missing/zero datasets show unavailable instead of fabricated percentages",()=>{
  const data=normalizedTrafficSources([],{rows:[{source:"facebook",visits:10}]});
  assert.equal(data.rows[0].sessionPercent,null);assert.equal(data.rows[0].visitPercent,100);assert.equal(data.rows[0].inquiries,0);
  assert.equal(normalizedTrafficSources([{source:"facebook",sessions:1}]).rows[0].visitPercent,null);
  assert.equal(normalizedTrafficSources([{source:"facebook",sessions:NaN}],{rows:[]}).rows[0].sessionPercent,null);
});

test("simple view uses one source dataset and keeps website actions separate",()=>{
  const result=simpleTrafficSources([{source:"unattributed",sessions:262,whatsapp_clicks:3,inquiries:1}],{rows:[{source:"facebook",visits:310},{source:"direct_unknown",visits:580}]});
  assert.equal(result.dataset,"cloudflare");assert.equal(result.total,890);assert.equal(result.rows.length,2);
  assert.equal(result.rows.find(row=>row.source==="unknown").count,580);
  assert.equal(result.whatsappClicks,3);assert.equal(result.inquiries,1);
  assert.equal(simpleTrafficSources([{source:"facebook",sessions:4}]).dataset,"website");
  assert.equal(simpleTrafficSources([{source:"facebook",sessions:4}],{rows:[]}).total,4);
  assert.deepEqual(simpleTrafficSources([],null).rows,[]);
});
