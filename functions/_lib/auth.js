import { createRemoteJWKSet, jwtVerify } from "jose";

const jwksByUrl = new Map();

const normalizedTeamDomain = (value = "") => value
  .trim()
  .replace(/^https?:\/\//i, "")
  .replace(/\/$/, "");

const configuredAdmins = (value = "") => new Set(value
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean));

export async function requireAccessIdentity(context, { audienceEnv = "CF_ACCESS_AUD", allowEmails = null } = {}) {
  const assertion = context.request.headers.get("cf-access-jwt-assertion");
  const teamDomain = normalizedTeamDomain(context.env.CF_ACCESS_TEAM_DOMAIN);
  const audience = String(context.env?.[audienceEnv] || "").trim();
  if (!assertion || !teamDomain || !audience) return null;

  try {
    const issuer = `https://${teamDomain}`;
    const certsUrl = `${issuer}/cdn-cgi/access/certs`;
    if (!jwksByUrl.has(certsUrl)) jwksByUrl.set(certsUrl, createRemoteJWKSet(new URL(certsUrl)));
    const { payload } = await jwtVerify(assertion, jwksByUrl.get(certsUrl), { issuer, audience });
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) return null;
    if (allowEmails && !allowEmails.has(email)) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function requireAdmin(context) {
  const admins = configuredAdmins(context.env?.ADMIN_EMAILS);
  return admins.size
    ? requireAccessIdentity(context, { audienceEnv: "CF_ACCESS_AUD", allowEmails: admins })
    : null;
}

export async function requireRecipient(context) {
  return requireAccessIdentity(context, { audienceEnv: "CF_ACCESS_RECIPIENT_AUD" });
}
