import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectPublicImage } from "./image-policy.mjs";

const chunk = (type, data) => {
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32LE(data.length, 4);
  return Buffer.concat([header, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};

const webp = (extraChunks = []) => {
  const vp8x = Buffer.alloc(10);
  vp8x.writeUIntLE(1919, 4, 3);
  vp8x.writeUIntLE(1079, 7, 3);
  const body = Buffer.concat([chunk("VP8X", vp8x), ...extraChunks]);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
};

test("reads WebP dimensions and rejects privacy-bearing chunks", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pdd-image-policy-"));
  try {
    const cleanPath = path.join(directory, "clean.webp");
    const dirtyPath = path.join(directory, "dirty.webp");
    fs.writeFileSync(cleanPath, webp());
    fs.writeFileSync(dirtyPath, webp([chunk("EXIF", Buffer.from("private")), chunk("XMP ", Buffer.from("private"))]));
    assert.deepEqual(inspectPublicImage(cleanPath).metadata, []);
    assert.equal(inspectPublicImage(cleanPath).width, 1920);
    assert.equal(inspectPublicImage(cleanPath).height, 1080);
    assert.deepEqual(inspectPublicImage(dirtyPath).metadata, ["EXIF", "XMP"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
