import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectPublicVideo, MAX_VIDEO_BYTES } from "./video-policy.mjs";

const box = (type, body = Buffer.alloc(0)) => {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8);
  header.write(type, 4, "latin1");
  return Buffer.concat([header, body]);
};

test("video policy rejects oversized files, source metadata and non-streaming containers", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pdd-video-policy-"));
  const file = path.join(directory, "video.mp4");
  try {
    fs.writeFileSync(file, Buffer.concat([box("ftyp"), box("moov"), box("mdat")]));
    assert.ok(inspectPublicVideo(file).bytes > 0);
    fs.writeFileSync(file, Buffer.concat([box("ftyp"), box("mdat"), box("moov")]));
    assert.throws(() => inspectPublicVideo(file), /faststart/);
    fs.writeFileSync(file, Buffer.concat([box("ftyp"), box("moov", box("udta", box("©xyz"))), box("mdat")]));
    assert.throws(() => inspectPublicVideo(file), /metadata/);
    fs.writeFileSync(file, Buffer.concat([box("ftyp"), box("moov", box("udta", box("uuid"))), box("mdat")]));
    assert.throws(() => inspectPublicVideo(file), /metadata/);
    fs.writeFileSync(file, Buffer.from("not-a-video"));
    assert.throws(() => inspectPublicVideo(file), /Malformed/);
    fs.truncateSync(file, MAX_VIDEO_BYTES + 1);
    assert.throws(() => inspectPublicVideo(file), /25 MiB/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("property gallery offers video playback without autoplay or photo selection", () => {
  const page = fs.readFileSync(new URL("../src/pages/PropertyPage.jsx", import.meta.url), "utf8");
  const player = fs.readFileSync(new URL("../src/components/PropertyVideo.jsx", import.meta.url), "utf8");
  assert.match(page, /listing\.videos\.map/);
  assert.match(page, /setActiveVideo\(null\)/);
  assert.match(page, /<PropertyVideo src=\{activeVideo\}/);
  assert.match(player, /controls playsInline preload="none"/);
  assert.doesNotMatch(player, /autoPlay/);
  assert.match(player, /onError/);
  assert.match(page, /const firstPhotoSelection = listing\.photos\.slice/);
});
