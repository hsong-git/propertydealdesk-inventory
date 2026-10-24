import test from "node:test";
import assert from "node:assert/strict";
import { detectAttribution, sessionAttribution, attributionSearch, campaignUrl } from "./trafficAttribution.js";

test("explicit campaign tags take priority and are sanitized", () => {
  const a=detectAttribution({search:"?utm_source=WhatsApp&utm_campaign=October+Rentals&utm_content=agents_group",referrer:"https://google.com"});
  assert.deepEqual(a,{source:"whatsapp",medium:"messaging",campaign:"october_rentals",content:"agents_group",method:"tag"});
  assert.equal(detectAttribution({search:"?src=fb"}).source,"facebook");
  assert.equal(detectAttribution({search:"?src=person@example.com"}).source,"direct_unknown");
});

test("detects external referrers without recording full URLs or inventing internal sources", () => {
  assert.equal(detectAttribution({referrer:"https://www.google.com.my/search?q=private"}).medium,"organic_search");
  assert.equal(detectAttribution({referrer:"https://l.facebook.com/l.php?u=private"}).source,"facebook");
  assert.equal(detectAttribution({referrer:"https://example.com/private?email=hidden"}).source,"example.com");
  assert.equal(detectAttribution({referrer:"https://scmi.myeviv.com/property/unit",hostname:"property.myeviv.com"}).source,"direct_unknown");
  assert.equal(detectAttribution({referrer:"javascript:alert(1)"}).source,"direct_unknown");
});

test("first-touch attribution remains stable through navigation and return clicks in the same tab", () => {
  const data=new Map();const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const first=sessionAttribution({search:"?src=whatsapp"},storage);
  assert.deepEqual(sessionAttribution({search:"?src=facebook"},storage),first);
  assert.deepEqual(sessionAttribution({},storage),first);
  assert.equal(sessionAttribution({search:"?src=telegram"},{getItem(){throw new Error()},setItem(){throw new Error()}}).source,"telegram");
});

test("short links preserve safe attribution while share URLs restrict destinations", () => {
  const query=new URLSearchParams(attributionSearch('?src=whatsapp&utm_campaign=rentals&intent=WTL&email=private&v=version'));
  assert.equal(query.get('src'),'whatsapp');assert.equal(query.get('intent'),'WTL');assert.equal(query.has('email'),false);
  const url=new URL(campaignUrl('https://scmi.myeviv.com/i/WTS1039?v=1&preview=7',{source:'facebook',medium:'social',campaign:'october'}));
  assert.equal(url.searchParams.get('v'),'1');assert.equal(url.searchParams.get('utm_campaign'),'october');
  assert.throws(()=>campaignUrl('https://evil.test/',{source:'whatsapp'}));
  assert.throws(()=>campaignUrl('https://property.myeviv.com/admin',{source:'whatsapp'}));
});

test("recognises messaging web/app referrers only when supplied", () => {
  for (const referrer of ["https://web.whatsapp.com/", "https://www.whatsapp.com/", "android-app://com.whatsapp/", "android-app://com.whatsapp.w4b/"]) {
    const result = detectAttribution({ referrer });
    assert.equal(result.source, "whatsapp");
    assert.equal(result.medium, "messaging");
  }
  assert.equal(detectAttribution({ referrer: "android-app://com.facebook.katana/" }).source, "facebook");
  assert.equal(detectAttribution({ referrer: "https://t.me/" }).source, "telegram");
  assert.equal(detectAttribution({ referrer: "https://whatsapp.com.evil.test/" }).source, "whatsapp.com.evil.test");
  assert.equal(detectAttribution({ referrer: "android-app://unknown.app/" }).source, "direct_unknown");
  assert.equal(detectAttribution({ search: "?fbclid=opaque-private-id" }).source, "direct_unknown");
});

test("authentication is not mistaken for Google search acquisition", () => {
  assert.equal(detectAttribution({ referrer: "https://accounts.google.com/" }).source, "authentication_return");
  assert.equal(detectAttribution({ referrer: "https://dry-dust-2e1c.cloudflareaccess.com/" }).medium, "authentication");
});

test("server landing evidence fills missing referrers without overriding tags or first touch", () => {
  assert.equal(detectAttribution({ serverSource: "facebook", serverMedium: "social" }).method, "server_referrer");
  assert.equal(detectAttribution({ search: "?src=telegram", serverSource: "facebook", serverMedium: "social" }).source, "telegram");
  assert.equal(detectAttribution({ serverSource: "person@example.com", serverMedium: "social" }).source, "direct_unknown");
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const original = sessionAttribution({ serverSource: "facebook", serverMedium: "social" }, storage);
  assert.deepEqual(sessionAttribution({ search: "?src=whatsapp" }, storage), original);
});
