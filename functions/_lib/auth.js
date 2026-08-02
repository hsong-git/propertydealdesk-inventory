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

const isLocalAdminRequest = (request) => {
  try {
    const url = new URL(request.url);
    return url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  } catch {
    return false;
  }
};

export async function requireAdmin(context) {
  if (isLocalAdminRequest(context.request)) return { email: "local-admin@propertydealdesk.local", local: true };

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
