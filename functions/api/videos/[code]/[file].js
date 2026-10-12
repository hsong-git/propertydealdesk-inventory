const MAX_BYTES = 25 * 1024 * 1024;

export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || "");
  // Ignore malformed or multipart ranges, as allowed by HTTP.
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return false;
  if (first === null) return last > 0 ? { start: Math.max(0, size - last), end: size - 1 } : false;
  if (first >= size || (last !== null && last < first)) return false;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

function sliceStream(body, start, end) {
  const reader = body.getReader();
  let offset = 0;
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) { controller.error(new Error("Truncated video asset")); return; }
          const previous = offset;
          offset += value.byteLength;
          if (offset > start) controller.enqueue(value.subarray(Math.max(0, start - previous), Math.min(value.byteLength, end + 1 - previous)));
          if (offset > end) { controller.close(); await reader.cancel(); return; }
          if (offset > start) return;
        }
      } catch (error) { controller.error(error); await reader.cancel(); }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  if (!/^(WTL|WTS|WTSL)\d+$/.test(params.code) || !/^video-[a-f0-9]{20}\.mp4$/.test(params.file)) return new Response(null, { status: 404 });
  const assetURL = new URL(`/inventory/${params.code}/${params.file}`, request.url);
  // Do not forward client conditionals or Range: obtain a complete immutable asset.
  const getAsset = () => env.ASSETS.fetch(new Request(assetURL, { headers: { "Accept-Encoding": "identity" } }));
  let asset = await getAsset();
  if (asset.status !== 200 || !(asset.headers.get("content-type") || "").startsWith("video/mp4")) {
    await asset.body?.cancel();
    return new Response(null, { status: 404 });
  }
  let size = Number(asset.headers.get("content-length"));
  if (!size) {
    // Some asset bindings omit Content-Length. Count without buffering the MP4,
    // then reopen it for streaming. Memory usage stays independent of file size.
    const reader = asset.body.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return new Response(null, { status: 502 }); }
    }
    asset = await getAsset();
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BYTES || asset.status !== 200) {
    await asset.body?.cancel();
    return new Response(null, { status: 502 });
  }
  const headers = new Headers({
    "Content-Type": "video/mp4", "Accept-Ranges": "bytes",
    "Content-Length": String(size), "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  const etag = asset.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  if (request.method === "HEAD") { await asset.body?.cancel(); return new Response(null, { headers }); }
  const ifRange = request.headers.get("if-range");
  const range = !ifRange || (etag && !etag.startsWith("W/") && ifRange === etag) ? parseRange(request.headers.get("range"), size) : null;
  if (range === false) {
    await asset.body?.cancel();
    headers.set("Content-Range", `bytes */${size}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  }
  if (!range) return new Response(asset.body, { headers });
  const length = range.end - range.start + 1;
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(length));
  let body = sliceStream(asset.body, range.start, range.end);
  // Workers uses this stream type to preserve the exact Content-Length.
  if (typeof FixedLengthStream !== "undefined") {
    const fixed = new FixedLengthStream(length);
    context.waitUntil(body.pipeTo(fixed.writable).catch((error) => {
      console.error(JSON.stringify({ message: "Video range stream failed", error: String(error) }));
    }));
    body = fixed.readable;
  }
  return new Response(body, { status: 206, headers });
}
