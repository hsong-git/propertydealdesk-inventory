import assert from "node:assert/strict";
import test from "node:test";
import { withEntryAttribution } from "./entryAttribution.js";

test("only inserts sanitised landing labels and disables shared caching", async () => {
  let injected = "";
  const previous = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = class {
    on(selector, handler) {
      assert.equal(selector, "head");
      handler.element({ prepend(html, options) { injected = html; assert.equal(options.html, true); } });
      return this;
    }
    transform(response) { return response; }
  };
  try {
    const response = withEntryAttribution(new Response("<html><head></head></html>", { headers: {"content-type":"text/html", "cache-control":"public,max-age=3600", etag:'"asset"'} }), new Request("https://property.myeviv.com/i/WTL0070", {headers:{referer:"https://m.facebook.com/private?phone=60123456789"}}));
    assert.match(injected, /content="facebook"/);
    assert.doesNotMatch(injected, /601234|private|phone/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("etag"), null);
  } finally { globalThis.HTMLRewriter = previous; }
});

test("does not transform APIs, HEAD, redirects, errors, missing or internal referrers", () => {
  for (const [method, type, status, referrer] of [
    ["GET","application/json",200,"https://facebook.com"], ["HEAD","text/html",200,"https://facebook.com"],
    ["GET","text/html",302,"https://facebook.com"], ["GET","text/html",404,"https://facebook.com"],
    ["GET","text/html",200,""], ["GET","text/html",200,"https://scmi.myeviv.com/"],
  ]) {
    const response = new Response("", {status, headers:{"content-type":type}});
    assert.equal(withEntryAttribution(response, new Request("https://property.myeviv.com/", {method,headers:{referer:referrer}})), response);
  }
});
