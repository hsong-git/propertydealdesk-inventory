import assert from "node:assert/strict";
import test from "node:test";
import { propertyPhotoWatermark, shouldRenderBrowserWatermark } from "./watermark.js";

test("uses the approved public property photo watermark lines and overlay default", () => {
  assert.deepEqual(propertyPhotoWatermark.lines, {
    title: "TRR HS Ong",
    subtitle: "property.myeviv.com",
  });
  assert.equal(propertyPhotoWatermark.mode, "overlay");
  assert.equal(propertyPhotoWatermark.opacity, 0.28);
});

test("disables browser overlay when watermarking is embedded or disabled", () => {
  assert.equal(shouldRenderBrowserWatermark({ mode: "overlay" }), true);
  assert.equal(shouldRenderBrowserWatermark({ mode: "embedded" }), false);
  assert.equal(shouldRenderBrowserWatermark({ mode: "disabled" }), false);
});
