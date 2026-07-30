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
