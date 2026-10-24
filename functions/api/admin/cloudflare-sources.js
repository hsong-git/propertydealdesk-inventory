import { requireAdmin } from "../../_lib/auth.js";
import { json, methodNotAllowed } from "../../_lib/http.js";
import { analyticsPeriod } from "../../_lib/analyticsPeriod.js";
import { readCloudflareSources } from "../../_lib/cloudflareSources.js";
import { cloudflareReferrerSnapshots } from "../../_data/cloudflareReferrers.js";

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({error:"Administrator access required."},401);
  const params = new URL(context.request.url).searchParams;
  const host = params.get("host") || "property.myeviv.com";
  const days = Number(params.get("days") || 30);
  if (!["property.myeviv.com","scmi.myeviv.com"].includes(host) || ![7,30,90].includes(days)) return json({error:"Invalid analytics selection."},400);
  const snapshot = cloudflareReferrerSnapshots.find(item => item.site_host === host && item.days === days);
  // Never deploy a CLI OAuth credential here. Only a separately provisioned,
  // account-scoped, read-only Analytics API token belongs in this binding.
  if (context.env.CF_ANALYTICS_READ_TOKEN) {
    try {
      const report = await readCloudflareSources({token:context.env.CF_ANALYTICS_READ_TOKEN,host,days,period:analyticsPeriod(days)});
      return json({report});
    } catch { return json({report:snapshot || null, notice:"Cloudflare live refresh unavailable; showing dated snapshot."}); }
  }
  return json({report:snapshot || null,notice:"Dated snapshot. Automatic refresh requires a separate read-only Analytics API token."});
}
export const onRequest = context => context.request.method === "GET" ? onRequestGet(context) : methodNotAllowed("GET");
