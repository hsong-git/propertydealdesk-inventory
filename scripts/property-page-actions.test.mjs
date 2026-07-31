import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { shareListing } from "../src/utils/listing.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("property page does not render a separate Copy short link action", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "pages", "PropertyPage.jsx"), "utf8");
  assert.doesNotMatch(source, /Copy short link|Short link copied|onCopyShortLink|shortLinkCopied/);
  assert.match(source, /Share property/);
});

test("property cards expose a compact Copy posting action", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "components", "PropertyCard.jsx"), "utf8");
  const css = fs.readFileSync(path.join(projectRoot, "src", "styles", "site.css"), "utf8");
  assert.match(source, /postingText\(listing, agentProfile\)/);
  assert.match(source, /property-price-row/);
  assert.match(source, /copy-posting-control/);
  assert.match(source, /copy-posting-icon-button/);
  assert.match(source, /copy-posting-prompt/);
  assert.match(source, />Copied</);
  assert.match(source, /Copy posting/);
  assert.match(css, /\.property-price-row/);
  assert.match(css, /\.copy-posting-control/);
  assert.match(css, /\.copy-posting-icon-button/);
  assert.match(css, /\.copy-posting-prompt/);
  assert.match(css, /right: 38px/);
  assert.match(css, /width: 32px/);
});

test("fullscreen photo viewer applies direction-aware slide classes", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src", "pages", "PropertyPage.jsx"), "utf8");
  const css = fs.readFileSync(path.join(projectRoot, "src", "styles", "site.css"), "utf8");
  assert.match(source, /setLightboxSlide\(direction > 0 \? "next" : "previous"\)/);
  assert.match(source, /slide-\$\{lightboxSlide\}/);
  assert.match(source, /onAnimationEnd=\{\(\) => setLightboxSlide\(""\)\}/);
  assert.match(css, /\.lightbox-image\.slide-next/);
  assert.match(css, /@keyframes lightbox-slide-previous/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("Share property falls back to copying the public short URL", async () => {
  const previousNavigator = globalThis.navigator;
  const writes = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (value) => {
          writes.push(value);
        },
      },
    },
  });

  try {
    const result = await shareListing({
      code: "wts0029",
      slug: "wts0029-example-property",
      title: "Example Property",
      location: "Klang",
    });
    assert.equal(result, "copied");
    assert.deepEqual(writes, ["https://property.myeviv.com/i/WTS0029"]);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: previousNavigator,
    });
  }
});
