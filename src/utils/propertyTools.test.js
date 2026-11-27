import test from "node:test";
import assert from "node:assert/strict";
import { mortgageEstimate, purchaseCosts, rentalMoveInEstimate, areaMapLinks, formatViewingDateInput, parseViewingDate, displayViewingDate, validViewingTime, validViewingDate, malaysiaToday, viewingMessage } from "./propertyTools.js";
import { readFileSync } from "node:fs";
import { normalizeShortlist, resolveShortlist, shortlistMessage } from "./shortlist.js";
import { translateSite, SITE_TRANSLATIONS } from "./siteLanguage.js";
import { compareNewlyAdded } from "./listing.js";

const listing = { code: "WTL1", publicId: "public-1", slug: "home-1", title: "Example home", location: "Klang", price: 1500, intent: "WTL", alternateIntent: "WTS" };
test("catalogue starts with 6 newest properties and loads another 6 only by button", () => {
  const source = readFileSync(new URL("../pages/HomePage.jsx",import.meta.url),"utf8");
  assert.match(source,/INITIAL_VISIBLE_COUNT = 6/);
  assert.match(source,/LOAD_MORE_COUNT = 6/);
  assert.match(source,/NEW_LISTING_COUNT = 12/);
  assert.match(source,/sort: "newest"/);
  assert.match(source,/Math.min\(count \+ LOAD_MORE_COUNT, results.length\)/);
  assert.match(source,/onClick=\{\(\) => loadMore\("button"\)\}/);
  assert.doesNotMatch(source,/IntersectionObserver|loadMore\("automatic"\)|saved\.visible/);
  assert.match(source,/isNew=\{newListingIds.has\(listing.publicId\)\}/);
  const card = readFileSync(new URL("../components/PropertyCard.jsx",import.meta.url),"utf8");
  assert.match(card,/isNew \? <span className="new-badge"/);
  assert.ok(source.indexOf("<AreaLinks allLocations") > source.indexOf('className="property-grid"'));
  assert.match(source,/counts=\{options.locationCounts\}/);
  assert.doesNotMatch(source,/Browse all properties by page|featured/);
  assert.doesNotMatch(card,/featured-badge|Featured/);
  const filters = readFileSync(new URL("../components/CatalogueFilters.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(filters,/Featured|Inventory view/);
  assert.match(source,/className="journey-start-link" to="\/inquiries"/);
  assert.ok(source.indexOf('className="home-journey"') < source.indexOf('className="co-broke-panel"'));
});
test("newly added sorting is newest-first, stable and handles missing dates", () => {
  const rows = [{code:"old",createdAt:"2026-01-01"},{code:"unknown"},{code:"new",createdAt:"2026-11-27"}];
  assert.deepEqual(rows.sort(compareNewlyAdded).map(x=>x.code),["new","old","unknown"]);
});
test("mortgage cash group contains only upfront costs, not the financed loan or income", () => {
  const source = readFileSync(new URL("../components/PropertyTools.jsx",import.meta.url),"utf8");
  const group = source.split('<section className="mortgage-cash-group"')[1].split('</section>')[0];
  for (const label of ["Down payment","Stamp duty (transfer)","Stamp duty (loan, 0.5%)","Legal fee SPA (est.)","Legal fee loan (est.)","Estimated cash upfront"]) assert.ok(group.includes(label));
  assert.doesNotMatch(group,/Loan amount|Illustrative income/);
});
test("rental move-in cash separates 2+1 deposits, first month and current agreement costs", () => {
  assert.deepEqual(rentalMoveInEstimate(1500), { rentalDeposit:3000, utilityDeposit:1500, advance:1500, deposits:4500, rentalSubtotal:6000, stampDuty:72, copyDuty:10, stampingTotal:82, legalFee:500, otherCharges:0, agreementCosts:582, upfront:6582 });
  assert.equal(rentalMoveInEstimate(1500,24).stampDuty,216);
  assert.equal(rentalMoveInEstimate(1500,36).stampDuty,216);
  assert.equal(rentalMoveInEstimate(2000).legalFee,600);
  assert.equal(rentalMoveInEstimate(500).stampDuty,24); // No obsolete RM2,400 deduction.
  assert.equal(rentalMoveInEstimate(1500,12,25,300).upfront,6407);
  assert.equal(rentalMoveInEstimate(1800).upfront,7837);
  assert.equal(rentalMoveInEstimate(10001).upfront,null);
  assert.equal(rentalMoveInEstimate(10001,12,0,3100).legalFee,3100);
  assert.equal(rentalMoveInEstimate(1500,12,0,0).legalFee,0); // Explicit quote can be owner-paid.
  for(const args of [[""],[0],[-1],[NaN],[1500,48],[1500,12,-1],[1500,12,0,"bad"]]) assert.equal(rentalMoveInEstimate(...args),null);
});
test("rental presentation separates subtotals, marks only deposits refundable and omits tax", () => {
  const source = readFileSync(new URL("../components/PropertyTools.jsx",import.meta.url),"utf8").split("export function RentalMoveInEstimate")[1];
  assert.match(source,/Deposits & advance subtotal/);
  assert.match(source,/TA & legal fees subtotal/);
  assert.match(source,/"TA stamping"/);
  assert.doesNotMatch(source,/including 1 copy/);
  assert.match(source,/\["Advance rental \(1 month\)",estimate.advance,false\]/);
  assert.doesNotMatch(source,/setSst|estimate.legalTax|t\("Service tax on legal fee"\)/);
  assert.match(source,/https:\/\/www.easylaw.com.my\/app\/calculator\/tenancy_output/);
  assert.doesNotMatch(source,/hasil.gov.my|malaysianbar.org.my/);
  assert.doesNotMatch(source,/Other quoted charges|setOther|Quoted TA \/ legal fee/);
});
test("mortgage calculation matches fixed-payment example, zero interest and no loan", () => {
  // CFPB published example: 100,000 principal, 4% annual rate, 30 years ≈477/month.
  assert.ok(Math.abs(mortgageEstimate(100000, 100, 4, 30).monthly - 477.415295) < 0.00001);
  assert.deepEqual(mortgageEstimate(120000, 50, 0, 10), { principal: 60000, downPayment: 60000, monthly: 500, interest: 0 });
  assert.equal(mortgageEstimate(100000, 0, 4, 30).monthly, 0);
  assert.ok(Number.isFinite(mortgageEstimate(100000, 90, 0.00000001, 40).monthly));
});
test("invalid mortgage values never produce misleading estimates", () => {
  for (const args of [["",90,4,35],[0,90,4,35],[500000,101,4,35],[500000,90,-1,35],[500000,90,4,0],[500000,90,4,1.5],[Infinity,90,4,35],[500000,90,"bad",35]]) assert.equal(mortgageEstimate(...args), null);
});
test("map destinations encode area names and do not claim exact coordinates", () => {
  const links = areaMapLinks("Klang & Shah Alam");
  assert.equal(new URL(links.google).hostname, "www.google.com");
  assert.equal(new URL(links.google).searchParams.get("query"), "Klang & Shah Alam, Malaysia");
  assert.equal(new URL(links.waze).searchParams.get("q"), "Klang & Shah Alam, Malaysia");
  for (const value of [null,"","N/A","Unknown"]) assert.equal(areaMapLinks(value), null);
});
test("viewing dates use Malaysia calendar and reject past or impossible dates", () => {
  assert.equal(malaysiaToday(new Date("2026-11-26T17:00:00Z")), "2026-11-27");
  assert.equal(validViewingDate("2026-11-28", "2026-11-27"), true);
  for (const date of ["2026-02-30","2026-11-26","bad",""]) assert.equal(validViewingDate(date,"2026-11-27"), false);
});
test("viewing message includes selected offer and current site's URL, not a confirmed booking", () => {
  const date = "2099-01-01";
  const result = viewingMessage(listing, { date, time:"14:30", name:"Visitor", note:"Prefer a quiet time", intent:"WTS" }, text => text, "https://property.myeviv.com");
  assert.equal(result, "Hi HS Ong, I would like to request a viewing.\n\nWTL1 · Example home\n*Preferred date:* 01/01/2099\n*Preferred time:* 14:30 (MYT)\n*Name:* Visitor\n*Note:* Prefer a quiet time\n\nPlease confirm availability and the appointment time.\nhttps://property.myeviv.com/i/WTL1?intent=WTS");
  const noNote = viewingMessage(listing, {date,time:"09:00",name:"Visitor"}, text=>text,"https://www.myeviv.com");
  assert.match(noNote,/https:\/\/www.myeviv.com\/i\/WTL1\?intent=WTL/);
  assert.doesNotMatch(noNote,/\*Note:\*/);
  assert.match(result, /Please confirm availability/);
  assert.equal(viewingMessage(listing,{date,time:"bad"}), "");
});
test("purchase cost breakdown matches the supplied 1.38m example and scale boundaries", () => {
  const costs = purchaseCosts(1380000, 1242000, 5499);
  assert.deepEqual(costs, { transferDuty:39200, loanDuty:6210, spaLegal:15050, loanLegal:13670, upfront:212130, illustrativeIncome:9165 });
  for (const [price,duty] of [[100000,1000],[500000,9000],[1000000,24000],[1000001,24004]]) assert.equal(purchaseCosts(price,0,0).transferDuty,duty);
  assert.equal(purchaseCosts(500000,0,0).loanLegal,0);
  assert.equal(purchaseCosts(500000,0,0).loanDuty,0);
  assert.equal(purchaseCosts(7500001,0,0).upfront,null);
  assert.equal(purchaseCosts(NaN,0,0),null);
});
test("viewing requires a real dd/mm/yyyy date, exact time and nonblank name", () => {
  assert.equal(formatViewingDateInput("15122099"),"15/12/2099");
  assert.equal(formatViewingDateInput("15/12/2099"),"15/12/2099");
  assert.equal(formatViewingDateInput("151"),"15/1");
  assert.equal(formatViewingDateInput("abc"),"");
  assert.equal(parseViewingDate("15/12/2099"),"2099-12-15");
  assert.equal(displayViewingDate("2099-12-15"),"15/12/2099");
  assert.equal(parseViewingDate("12/15/2099"),"2099-15-12");
  assert.equal(validViewingDate(parseViewingDate("12/15/2099")),false);
  for (const time of ["24:00","Morning","Any time",""]) assert.equal(validViewingTime(time),false);
  assert.equal(validViewingTime("09:30"),true);
  assert.equal(viewingMessage(listing,{date:"2099-01-01",time:"09:30",name:" "}),"");
});
test("viewing and mortgage stay expanded, promotions and duplicate shortcut are removed", () => {
  const tools = readFileSync(new URL("../components/PropertyTools.jsx",import.meta.url),"utf8");
  const header = readFileSync(new URL("../components/Header.jsx",import.meta.url),"utf8");
  const home = readFileSync(new URL("../pages/HomePage.jsx",import.meta.url),"utf8");
  const detail = readFileSync(new URL("../pages/PropertyPage.jsx",import.meta.url),"utf8");
  assert.doesNotMatch(tools, /<details|<summary/);
  assert.match(tools, /<iframe.*loading="lazy"/);
  assert.doesNotMatch(header+home, /https:\/\/agenttools|agent-tools-panel/);
  assert.doesNotMatch(detail, /viewing-shortcut/);
});
test("shortlists validate input, cap length and resolve only the supplied catalogue", () => {
  assert.deepEqual(normalizeShortlist(["a","a",null,{},"<script>","b"]), ["a","b"]);
  assert.equal(normalizeShortlist(Array.from({length:40},(_,i)=>`p${i}`)).length,30);
  assert.deepEqual(resolveShortlist(["public-1","removed"],[listing]), [{key:"public-1",listing},{key:"removed",listing:null}]);
  const message=shortlistMessage([listing],text=>text,"https://www.myeviv.com");
  assert.match(message,/WTL1/); assert.match(message,/Example home/); assert.match(message,/https:\/\/www.myeviv.com\/property\/home-1/);
});
test("translations retain data and original copy, interpolate and cover all new dictionary entries", () => {
  for(const [key, values] of Object.entries(SITE_TRANSLATIONS)) { assert.equal(values.length,2); values.forEach(value => assert.ok(typeof value === "string" && value.trim())); assert.equal(translateSite("ms",key),values[0]); assert.equal(translateSite("zh",key),values[1]); }
  assert.equal(translateSite("en","We've got you, {name}.",{name:"Alex"}),"We've got you, Alex.");
  assert.equal(translateSite("zh","  Properties  "),"  房产  ");
  assert.equal(translateSite("ms","RM 1,500 / month"),"RM 1,500 / bulan");
  assert.equal(translateSite("zh",listing.title),listing.title);
  assert.equal(translateSite("zh",false),false);
  assert.equal(translateSite("zh",null),null);
});
