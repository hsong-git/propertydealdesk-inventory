import { spawnSync } from "node:child_process";
import { CATALOGUE_PROJECTS } from "./catalogue-build-mode.mjs";
import { verifyBuildProof } from "./catalogue-build-proof.mjs";

const mode = process.argv[2];
if (!Object.hasOwn(CATALOGUE_PROJECTS, mode)) throw new Error("Choose property or scmi.");
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run([process.env.npm_execpath, "run", `build:${mode}`]);
verifyBuildProof("dist", mode);
run(["node_modules/wrangler/bin/wrangler.js", "pages", "deploy", "dist", "--project-name", CATALOGUE_PROJECTS[mode], "--branch", "main"]);
