import assert from "node:assert/strict";
import test from "node:test";
import { onRequest, parseRange } from "./api/videos/[code]/[file].js";

const file = "video-02d6cee116d36d84ddfc.mp4";
function run(range, { method = "GET", host = "property.myeviv.com", length = true, ifRange, type = "video/mp4", code = "WTL0009" } = {}) {
  const headers = new Headers();
  if (range) headers.set("Range", range);
  if (ifRange) headers.set("If-Range", ifRange);
  return onRequest({
    request: new Request(`https://${host}/api/videos/${code}/${file}`, { method, headers }),
    params: { code, file },
    env: { ASSETS: { fetch: async (request) => {
      assert.equal(new URL(request.url).pathname, `/inventory/${code}/${file}`);
      assert.equal(request.headers.get("range"), null);
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new Uint8Array([0, 1, 2]));
        controller.enqueue(new Uint8Array([3, 4, 5]));
        controller.enqueue(new Uint8Array([6, 7, 8, 9]));
        controller.close();
      } }), { headers: { "Content-Type": type, ETag: '"video"', ...(length ? { "Content-Length": "10" } : {}) } });
    } } },
  });
}

test("serves precise video byte ranges on both catalogue origins", async () => {
  for (const host of ["property.myeviv.com", "scmi.myeviv.com"]) {
    const response = await run("bytes=2-7", { host });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 2-7/10");
    assert.equal(response.headers.get("content-length"), "6");
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2, 3, 4, 5, 6, 7]);
  }
});
test("supports open-ended, suffix, and clamped ranges", async () => {
  for (const [range, expected] of [["bytes=7-", [7, 8, 9]], ["bytes=-2", [8, 9]], ["bytes=8-99", [8, 9]], ["bytes=-99", [0,1,2,3,4,5,6,7,8,9]]]) {
    const response = await run(range);
    assert.equal(response.status, 206);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], expected);
  }
});
test("rejects unsatisfiable ranges and ignores malformed/multipart ranges", async () => {
  for (const range of ["bytes=10-", "bytes=5-2", "bytes=-0"]) {
    const response = await run(range);
    assert.equal(response.status, 416);
    assert.equal(response.headers.get("content-range"), "bytes */10");
  }
  for (const range of ["junk", "bytes=0-1,4-5", "bytes=-"]) {
    const response = await run(range);
    assert.equal(response.status, 200);
    assert.equal((await response.arrayBuffer()).byteLength, 10);
  }
  assert.equal(parseRange("bytes=999999999999999999999-", 10), false);
});
test("HEAD and If-Range follow full-response semantics", async () => {
  const head = await run("bytes=2-7", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "10");
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal((await run("bytes=2-7", { ifRange: '"old-video"' })).status, 200);
  assert.equal((await run("bytes=2-7", { ifRange: '"video"' })).status, 206);
});
test("handles assets without length and rejects non-video paths or methods", async () => {
  const response = await run("bytes=8-", { length: false });
  assert.equal(response.status, 206);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [8, 9]);
  assert.equal((await run(null, { type: "text/html" })).status, 404);
  assert.equal((await run(null, { code: "../secret" })).status, 404);
  assert.equal((await run(null, { method: "POST" })).status, 405);
});
