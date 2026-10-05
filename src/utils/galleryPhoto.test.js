import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { galleryPhotoUrl } from "./galleryPhoto.js";

test("gallery saves use versioned, embedded-watermark image files", () => {
  assert.equal(galleryPhotoUrl("/inventory/WTL0092/cover.webp"), "/watermarked/color-logo-30-v2/inventory/WTL0092/cover.webp");
  for (const src of ["/inventory/../secret.webp", "https://example.com/photo.webp", ""]) {
    assert.throws(() => galleryPhotoUrl(src));
  }
  const page = fs.readFileSync(new URL("../pages/PropertyPage.jsx", import.meta.url), "utf8");
  assert.equal((page.match(/<PublicPropertyImage /g) || []).length, 4);
  assert.equal((page.match(/<PublicPropertyImage allowIndividualSave /g) || []).length, 4);
  const component = fs.readFileSync(new URL("../components/PublicPropertyImage.jsx", import.meta.url), "utf8");
  assert.match(component, /onContextMenu=\{allowIndividualSave \? undefined/);
  assert.match(component, /const showWatermark = !allowIndividualSave/);
});
