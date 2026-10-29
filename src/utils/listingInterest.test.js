import test from "node:test";
import assert from "node:assert/strict";
import {combinedListingSources, listingSourceBreakdown, listingInterestSummary} from "./listingInterest.js";

test("combines unavailable sources without assigning them to WhatsApp",()=>{
  const rows=combinedListingSources([{source:"unattributed",views:22,sessions:19},{source:"direct_unknown",views:2,sessions:1},{source:"facebook",views:3,sessions:2}]);
  assert.deepEqual(rows,[{source:"facebook",views:3,sessions:2},{source:"unknown",views:24,sessions:20}]);
  assert.deepEqual(combinedListingSources(),[]);
});

test("listing breakdown keeps c1-c4 separate from natural and legacy sources, with zero rows",()=>{
  const rows = listingSourceBreakdown([
    {source:"whatsapp",attribution_method:"tag",views:4,sessions:3},
    {source:"whatsapp",attribution_method:"app_referrer",views:2,sessions:1},
    {source:"whatsapp",views:1,sessions:1},
    {source:"facebook",attribution_method:"tag",views:2,sessions:2},
    {source:"iproperty",attribution_method:"tag",views:1,sessions:1},
    {source:"mudah",attribution_method:"tag",views:3,sessions:1},
    {source:"direct_unknown",views:2,sessions:2},
    {source:"unattributed",views:5,sessions:4},
  ]);
  assert.deepEqual(rows.slice(0,4),[
    {source:"whatsapp",postingCode:"c1",views:4,sessions:3},
    {source:"facebook",postingCode:"c2",views:2,sessions:2},
    {source:"iproperty",postingCode:"c3",views:1,sessions:1},
    {source:"mudah",postingCode:"c4",views:3,sessions:1},
  ]);
  assert.deepEqual(rows.slice(4),[{source:"whatsapp",views:3,sessions:2},{source:"unknown",views:7,sessions:6}]);
  assert.equal(rows.reduce((sum,r)=>sum+r.views,0),20);
  assert.deepEqual(listingSourceBreakdown().map(r=>[r.postingCode,r.views,r.sessions]),[["c1",0,0],["c2",0,0],["c3",0,0],["c4",0,0]]);
});
test("interest interpretation distinguishes contact, exploration, inquiry journeys and unavailable data",()=>{
  assert.equal(listingInterestSummary({viewing_sessions:20,contact_sessions:2}),"2 of 20 viewing sessions clicked WhatsApp (10.0%).");
  assert.match(listingInterestSummary({inquiry_sessions:1}),/inquiry followed/);
  assert.match(listingInterestSummary({engaged_sessions:2}),/exploration or sharing/);
  assert.match(listingInterestSummary({viewing_sessions:20}),/no further tracked action/);
  assert.match(listingInterestSummary(),/unavailable/);
});
