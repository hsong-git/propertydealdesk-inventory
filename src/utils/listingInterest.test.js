import test from "node:test";
import assert from "node:assert/strict";
import {combinedListingSources, listingInterestSummary} from "./listingInterest.js";

test("combines unavailable sources without assigning them to WhatsApp",()=>{
  const rows=combinedListingSources([{source:"unattributed",views:22,sessions:19},{source:"direct_unknown",views:2,sessions:1},{source:"facebook",views:3,sessions:2}]);
  assert.deepEqual(rows,[{source:"facebook",views:3,sessions:2},{source:"unknown",views:24,sessions:20}]);
  assert.deepEqual(combinedListingSources(),[]);
});
test("interest interpretation distinguishes contact, exploration, inquiry journeys and unavailable data",()=>{
  assert.equal(listingInterestSummary({viewing_sessions:20,contact_sessions:2}),"2 of 20 viewing sessions clicked WhatsApp (10.0%).");
  assert.match(listingInterestSummary({inquiry_sessions:1}),/inquiry followed/);
  assert.match(listingInterestSummary({engaged_sessions:2}),/exploration or sharing/);
  assert.match(listingInterestSummary({viewing_sessions:20}),/no further tracked action/);
  assert.match(listingInterestSummary(),/unavailable/);
});
