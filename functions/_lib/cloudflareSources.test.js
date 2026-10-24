import assert from "node:assert/strict";
import test from "node:test";
import { readCloudflareSources } from "./cloudflareSources.js";
import { onRequest } from "../api/admin/cloudflare-sources.js";

const period = {start:"2026-09-24T16:00:00.000Z",end:"2026-10-24T08:46:22.853Z"};
const result = groups => Response.json({data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:groups}]}},errors:null});
const group = (refererHost, visits) => ({dimensions:{refererHost},sum:{visits}});

test("Cloudflare aggregates visits (not pageviews), groups Facebook and separates sign-in", async () => {
  const report = await readCloudflareSources({token:"private-test-token",host:"property.myeviv.com",days:30,period,fetcher:async (url, options) => {
    assert.equal(url,"https://api.cloudflare.com/client/v4/graphql");
    assert.match(options.headers.authorization,/Bearer/);
    const {query} = JSON.parse(options.body);
    assert.match(query,/requestHost: "property.myeviv.com", bot: 0/);
    assert.doesNotMatch(query,/refererPath|clientIP|session/);
    return result([group("m.facebook.com",16),group("www.facebook.com",6),group("",37),group("accounts.google.com",1),group("property.myeviv.com",0)]);
  }});
  assert.equal(report.totalVisits,60);
  assert.equal(report.rows.find(row=>row.source==="facebook").visits,22);
  assert.equal(report.rows.find(row=>row.source==="authentication_return").visits,1);
  assert.equal(report.rows.find(row=>row.source==="direct_unknown").visits,37);
  assert.doesNotMatch(JSON.stringify(report),/private-test-token/);
});

test("90-day API queries have non-overlapping 30-day slices", async () => {
  const queries=[];
  await readCloudflareSources({token:"test",host:"scmi.myeviv.com",days:90,period:{start:"2026-07-26T16:00:00.000Z",end:period.end},fetcher:async (_url,options)=>{queries.push(JSON.parse(options.body).query);return result([]);}});
  assert.equal(queries.length,3);
  const bounds=queries.map(query=>[...query.matchAll(/datetime_(?:geq|leq): "([^"]+)"/g)].map(match=>Date.parse(match[1])));
  assert.equal(bounds[1][0],bounds[0][1]+1);
  assert.equal(bounds[2][0],bounds[1][1]+1);
});

test("invalid selections and API errors do not fabricate zero traffic", async () => {
  await assert.rejects(readCloudflareSources({token:"test",host:"evil.test",days:30,period}));
  await assert.rejects(readCloudflareSources({token:"test",host:"property.myeviv.com",days:30,period,fetcher:async()=>Response.json({errors:[{message:"private API failure"}]})}),/unavailable/);
});

test("Cloudflare endpoint is admin-only and returns host/period-specific dated snapshots", async () => {
  const denied = await onRequest({request:new Request("https://property.myeviv.com/api/admin/cloudflare-sources"),env:{}});
  assert.equal(denied.status,401);
  assert.doesNotMatch(await denied.text(),/890|310/);
  for (const host of ["property.myeviv.com","scmi.myeviv.com"]) for (const days of [7,30,90]) {
    const response = await onRequest({request:new Request(`http://localhost/api/admin/cloudflare-sources?host=${host}&days=${days}`),env:{}});
    assert.equal(response.status,200);
    assert.equal(response.headers.get("cache-control"),"no-store");
    const {report,notice}=await response.json();
    assert.equal(report.site_host,host);assert.equal(report.days,days);assert.equal(report.mode,"snapshot");
    assert.equal(report.totalVisits,report.rows.reduce((sum,row)=>sum+row.visits,0));
    assert.match(notice,/read-only/);
  }
  assert.equal((await onRequest({request:new Request("http://localhost/api/admin/cloudflare-sources?host=evil.test"),env:{}})).status,400);
  assert.equal((await onRequest({request:new Request("http://localhost/api/admin/cloudflare-sources",{method:"POST"}),env:{}})).status,405);
});
