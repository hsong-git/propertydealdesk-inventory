import assert from "node:assert/strict";
import test from "node:test";
import { currentAppScriptPath, deployedAppScriptPath } from "./useAppVersionReload.js";

test("detects the current built app script path", () => {
  const documentRef = {
    querySelectorAll() {
      return [
        { getAttribute: () => "/assets/vendor.js" },
        { getAttribute: () => "/assets/index-abc123.js" },
      ];
    },
  };

  assert.equal(currentAppScriptPath(documentRef, "https://property.myeviv.com"), "/assets/index-abc123.js");
});

test("extracts the deployed app script path from HTML", () => {
  const html = '<script type="module" crossorigin src="/assets/index-new456.js"></script>';

  assert.equal(deployedAppScriptPath(html), "/assets/index-new456.js");
});

test("returns an empty path when no built app script is present", () => {
  assert.equal(deployedAppScriptPath("<main>No script</main>"), "");
  assert.equal(currentAppScriptPath({ querySelectorAll: () => [] }), "");
});
