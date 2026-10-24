import { spawnSync } from "node:child_process";
import { catalogueBuildMode } from "./catalogue-build-mode.mjs";

const env = { ...process.env, VITE_CATALOGUE_MODE: process.argv[2] };
catalogueBuildMode(env);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this command through npm run build:property or npm run build:scmi.");
const result = spawnSync(process.execPath, [npmCli, "run", "build"], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
