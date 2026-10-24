// Read-only export. No credentials are printed, persisted in reports or deployed.
import fs from "node:fs";
import path from "node:path";
import { analyticsPeriod } from "../functions/_lib/analyticsPeriod.js";
import { readCloudflareSources } from "../functions/_lib/cloudflareSources.js";

let token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  const config = fs.readFileSync(path.join(process.env.USERPROFILE, ".wrangler/config/default.toml"), "utf8");
  token = /oauth_token\s*=\s*"([^"]+)"/.exec(config)?.[1];
}
if (!token) throw new Error("No existing Cloudflare credentials available.");
const reports = [];
const now = new Date();
for (const days of [7, 30, 90]) {
  for (const host of ["property.myeviv.com", "scmi.myeviv.com"]) {
    const report = await readCloudflareSources({ token, host, days, period: analyticsPeriod(days, now) });
    reports.push({ ...report, mode: "snapshot" });
  }
}
console.log(JSON.stringify(reports, null, 2));
