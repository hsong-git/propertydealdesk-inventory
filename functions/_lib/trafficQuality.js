const AUTOMATED_AGENT = /facebookexternalhit|\bfacebot\b|meta-(?:externalagent|externalfetcher|webindexer)|googlebot|bingbot|duckduckbot|baiduspider|yandexbot|applebot|headlesschrome|phantomjs|playwright|puppeteer|selenium|lighthouse|pagespeed|python-requests|curl\/|wget\//i;

export function trafficQuality(request, payload) {
  const bot = request.cf?.botManagement;
  let reason = "none";
  if (bot?.verifiedBot === true || bot?.signedAgent === true) reason = "cloudflare_verified_bot";
  else if (typeof bot?.score === "number" && bot.score >= 1 && bot.score < 30) reason = "cloudflare_likely_automated";
  else if (AUTOMATED_AGENT.test(request.headers.get("user-agent") || "")) reason = "automated_user_agent";
  else if (payload?.clientContext?.automation === true) reason = "browser_automation_signal";
  return { quality_version: 1, quality_bot: reason === "none" ? 0 : 1, quality_reason: reason };
}
