import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { CATALOGUE_PROJECTS } from "./catalogue-build-mode.mjs";

const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function writeBuildProof(root, mode) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
  if (!script || !html.includes(`name="pdd-catalogue-mode" content="${mode}"`)) throw new Error("Catalogue mode marker missing from built HTML.");
  const proof = { mode, project: CATALOGUE_PROJECTS[mode], script, scriptSha256: hash(path.join(root, script.slice(1))), builtAt: new Date().toISOString() };
  fs.writeFileSync(path.join(root, "catalogue-build.json"), JSON.stringify(proof, null, 2));
}

export function verifyBuildProof(root, mode) {
  const proof = JSON.parse(fs.readFileSync(path.join(root, "catalogue-build.json"), "utf8"));
  if (proof.mode !== mode || proof.project !== CATALOGUE_PROJECTS[mode]) throw new Error(`Refusing ${proof.mode} output for ${mode} deployment.`);
  if (!/^\/assets\/index-[\w-]+\.js$/.test(proof.script)) throw new Error("Invalid build script path.");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  if (!html.includes(`name="pdd-catalogue-mode" content="${mode}"`) || !html.includes(proof.script)) throw new Error("Build HTML does not match selected catalogue.");
  if (hash(path.join(root, proof.script.slice(1))) !== proof.scriptSha256) throw new Error("Build bundle changed after validation.");
  return proof;
}
