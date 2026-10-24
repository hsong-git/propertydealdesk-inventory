import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { catalogueBuildMode } from "./catalogue-build-mode.mjs";
import { writeBuildProof, verifyBuildProof } from "./catalogue-build-proof.mjs";

test("SCMI Cloudflare builds reject a missing or wrong mode", () => {
  const env = { CF_PAGES_URL: "https://abcd.propertydealdesk-scmi-catalogue.pages.dev" };
  assert.throws(() => catalogueBuildMode(env), /Refusing property build/);
  assert.equal(catalogueBuildMode({ ...env, VITE_CATALOGUE_MODE: "scmi" }), "scmi");
  assert.throws(() => catalogueBuildMode({ VITE_CATALOGUE_MODE: "typo" }), /Unknown/);
  assert.equal(catalogueBuildMode({}), "property");
});

test("deployment rejects the opposite catalogue and a modified bundle", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catalogue-proof-"));
  try {
    fs.mkdirSync(path.join(root, "assets"));
    fs.writeFileSync(path.join(root, "index.html"), '<meta name="pdd-catalogue-mode" content="scmi"><script src="/assets/index-abc.js"></script>');
    fs.writeFileSync(path.join(root, "assets/index-abc.js"), 'const mode="scmi";');
    writeBuildProof(root, "scmi");
    assert.equal(verifyBuildProof(root, "scmi").mode, "scmi");
    assert.throws(() => verifyBuildProof(root, "property"), /Refusing scmi output/);
    fs.appendFileSync(path.join(root, "assets/index-abc.js"), "changed");
    assert.throws(() => verifyBuildProof(root, "scmi"), /changed after validation/);
  } finally { fs.rmSync(root, { recursive: true }); }
});
