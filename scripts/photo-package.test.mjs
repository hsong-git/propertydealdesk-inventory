import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("private photo package builder embeds the approved watermark and versioned package contract", () => {
  const source = fs.readFileSync(path.join(projectRoot, "scripts", "build-photo-packages.mjs"), "utf8");
  assert.match(source, /import sharp from ["']sharp["']/);
  assert.match(source, /propertyPhotoWatermark/);
  assert.match(source, /watermarkVersion = ["']trr-hs-ong-v1["']/);
  assert.match(source, /watermarked: "true"/);
  assert.match(source, /packages\/\$\{inventory\.inventoryVersion\}\/\$\{listing\.code\}\.zip/);
  assert.match(source, /metadata\.exif|outputMetadata\.exif/);
});
