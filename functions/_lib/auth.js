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

export async function requireAdmin(context) {
  const assertion = context.request.headers.get("cf-access-jwt-assertion");
  const teamDomain = normalizedTeamDomain(context.env.CF_ACCESS_TEAM_DOMAIN);
  const audience = String(context.env.CF_ACCESS_AUD || "").trim();
  const admins = configuredAdmins(context.env.ADMIN_EMAILS);
  if (!assertion || !teamDomain || !audience || !admins.size) return null;

  try {
    const issuer = `https://${teamDomain}`;
    const certsUrl = `${issuer}/cdn-cgi/access/certs`;
    if (!jwksByUrl.has(certsUrl)) jwksByUrl.set(certsUrl, createRemoteJWKSet(new URL(certsUrl)));
    const { payload } = await jwtVerify(assertion, jwksByUrl.get(certsUrl), { issuer, audience });
    const email = String(payload.email || "").trim().toLowerCase();
    return admins.has(email) ? { email } : null;
  } catch {
    return null;
  }
}
