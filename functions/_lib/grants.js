export const GRANT_TTL_SECONDS = 24 * 60 * 60;
export const ACTIVE_TTL_SECONDS = 60 * 60;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SESSION_COOKIE = "pd_catalogue_photo_session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(WTS|WTL)[A-Za-z0-9-]+$/;
const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;

const requireBindings = (env) => {
  if (!env?.PHOTO_GRANTS_DB || !env?.PHOTO_PACKAGES) throw new Error("Photo grant storage is not configured.");
  if (!String(env.CURRENT_INVENTORY_VERSION || "").trim()) throw new Error("The current inventory version is not configured.");
};

const text = (value) => typeof value === "string" ? value.trim() : "";

export const normalizeEmail = (value) => text(value).toLowerCase();

export const isEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value));

const isSafeVersion = (value) => VERSION_PATTERN.test(text(value));

const isWatermarkedPackage = (object, code, version) => object
  && object.customMetadata?.sanitized === "true"
  && object.customMetadata?.watermarked === "true"
  && object.customMetadata?.watermarkVersion === "trr-hs-ong-v1"
  && object.customMetadata?.smiCode === code
  && object.customMetadata?.inventoryVersion === version;

export function packageKeyFor(code, inventoryVersion) {
  const normalizedCode = text(code).toUpperCase();
  const version = text(inventoryVersion);
  if (!CODE_PATTERN.test(normalizedCode) || !isSafeVersion(version)) return null;
  return `packages/${version}/${normalizedCode}.zip`;
}

export function generateGrantToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function hashGrantToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const rowToGrant = (row) => row ? ({
  id: row.id,
  scope: row.scope,
  recipientEmail: row.recipient_email,
  createdBy: row.created_by,
  createdAt: row.created_at,
  absoluteExpiresAt: row.absolute_expires_at,
  firstAccessAt: row.first_access_at || null,
  activeExpiresAt: row.active_expires_at || null,
  inventoryVersion: row.inventory_version,
  listingCode: row.listing_code || null,
  revokedAt: row.revoked_at || null,
}) : null;

const validGrant = (grant, now) => grant
  && !grant.revokedAt
  && Date.parse(grant.absoluteExpiresAt) > now.getTime()
  && (!grant.activeExpiresAt || Date.parse(grant.activeExpiresAt) > now.getTime());

function cookieValue(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

export function sessionCookieHeader(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function createCatalogueGrant({ env, email, createdBy, origin, now = new Date() }) {
  requireBindings(env);
  const recipientEmail = normalizeEmail(email);
  if (!isEmail(recipientEmail)) return null;
  const token = generateGrantToken();
  const tokenHash = await hashGrantToken(token);
  const createdAt = now.toISOString();
  const absoluteExpiresAt = new Date(now.getTime() + GRANT_TTL_SECONDS * 1000).toISOString();
  const id = crypto.randomUUID();
  await env.PHOTO_GRANTS_DB.prepare(`
    INSERT INTO photo_catalogue_grants (
      id, token_hash, scope, recipient_email, created_by, created_at,
      absolute_expires_at, inventory_version
    ) VALUES (?, ?, 'catalogue', ?, ?, ?, ?, ?)
  `).bind(
    id, tokenHash, recipientEmail, normalizeEmail(createdBy), createdAt,
    absoluteExpiresAt, String(env.CURRENT_INVENTORY_VERSION).trim(),
  ).run();
  return {
    id,
    token,
    recipientEmail,
    inventoryVersion: String(env.CURRENT_INVENTORY_VERSION).trim(),
    createdAt,
    expiresAt: absoluteExpiresAt,
    url: `${origin}/download/${token}`,
  };
}

export async function findGrantByToken({ env, token }) {
  requireBindings(env);
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = await hashGrantToken(token);
  const row = await env.PHOTO_GRANTS_DB.prepare(`
    SELECT id, scope, recipient_email, created_by, created_at, absolute_expires_at,
      first_access_at, active_expires_at, inventory_version, revoked_at, listing_code
    FROM photo_catalogue_grants WHERE token_hash = ?
  `).bind(tokenHash).first();
  return rowToGrant(row);
}

export async function createListingGrant({ env, requestId, listingCode, createdBy, now = new Date() }) {
  requireBindings(env);
  const code = text(listingCode).toUpperCase();
  if (!/^(WTS|WTL)[A-Z0-9-]+$/.test(code)) return null;
  const token = generateGrantToken();
  const tokenHash = await hashGrantToken(token);
  const createdAt = now.toISOString();
  const absoluteExpiresAt = new Date(now.getTime() + GRANT_TTL_SECONDS * 1000).toISOString();
  const id = crypto.randomUUID();
  await env.PHOTO_GRANTS_DB.prepare(`
    INSERT INTO photo_catalogue_grants (id, token_hash, scope, recipient_email, created_by, created_at, absolute_expires_at, inventory_version, listing_code)
    VALUES (?, ?, 'catalogue', ?, ?, ?, ?, ?, ?)
  `).bind(id, tokenHash, `request:${text(requestId)}`, normalizeEmail(createdBy), createdAt, absoluteExpiresAt, String(env.CURRENT_INVENTORY_VERSION).trim(), code).run();
  return { id, token, listingCode: code, createdAt, expiresAt: absoluteExpiresAt, url: `${env.PUBLIC_SITE_ORIGIN || ""}/download/${token}` };
}

export async function activateCatalogueGrant({ env, token, recipientEmail, now = new Date() }) {
  const grant = await findGrantByToken({ env, token });
  const email = normalizeEmail(recipientEmail);
  if (!grant || !isEmail(email) || grant.recipientEmail !== email || !validGrant(grant, now)) return null;

  const firstAccessAt = grant.firstAccessAt || now.toISOString();
  const activeExpiresAt = grant.activeExpiresAt || new Date(Math.min(
    Date.parse(grant.absoluteExpiresAt),
    now.getTime() + ACTIVE_TTL_SECONDS * 1000,
  )).toISOString();
  if (!grant.firstAccessAt) {
    await env.PHOTO_GRANTS_DB.prepare(`
      UPDATE photo_catalogue_grants
      SET first_access_at = ?, active_expires_at = ?
      WHERE id = ? AND first_access_at IS NULL AND revoked_at IS NULL AND absolute_expires_at > ?
    `).bind(firstAccessAt, activeExpiresAt, grant.id, now.toISOString()).run();
  }
  const sessionToken = generateGrantToken();
  const sessionHash = await hashGrantToken(sessionToken);
  await env.PHOTO_GRANTS_DB.prepare(`
    INSERT INTO photo_catalogue_sessions (session_hash, grant_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(sessionHash, grant.id, now.toISOString(), activeExpiresAt).run();
  return { grant: { ...grant, firstAccessAt, activeExpiresAt }, sessionToken, activeExpiresAt };
}

export async function activateListingGrant({ env, token, now = new Date() }) {
  const grant = await findGrantByToken({ env, token });
  if (!grant?.listingCode || !validGrant(grant, now)) return null;
  const firstAccessAt = grant.firstAccessAt || now.toISOString();
  const activeExpiresAt = grant.activeExpiresAt || new Date(Math.min(Date.parse(grant.absoluteExpiresAt), now.getTime() + ACTIVE_TTL_SECONDS * 1000)).toISOString();
  if (!grant.firstAccessAt) await env.PHOTO_GRANTS_DB.prepare("UPDATE photo_catalogue_grants SET first_access_at = ?, active_expires_at = ? WHERE id = ? AND first_access_at IS NULL AND revoked_at IS NULL").bind(firstAccessAt, activeExpiresAt, grant.id).run();
  const sessionToken = generateGrantToken();
  await env.PHOTO_GRANTS_DB.prepare("INSERT INTO photo_catalogue_sessions (session_hash, grant_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await hashGrantToken(sessionToken), grant.id, now.toISOString(), activeExpiresAt).run();
  return { grant: { ...grant, firstAccessAt, activeExpiresAt }, sessionToken, activeExpiresAt };
}

export async function resolveCatalogueSession({ env, request, code, now = new Date(), includeObject = false }) {
  requireBindings(env);
  const sessionToken = cookieValue(request, SESSION_COOKIE);
  if (!TOKEN_PATTERN.test(sessionToken)) return null;
  const sessionHash = await hashGrantToken(sessionToken);
  const row = await env.PHOTO_GRANTS_DB.prepare(`
    SELECT g.id, g.scope, g.recipient_email, g.created_by, g.created_at, g.absolute_expires_at,
      g.first_access_at, g.active_expires_at, g.inventory_version, g.revoked_at,
      s.expires_at AS session_expires_at
    FROM photo_catalogue_sessions s
    JOIN photo_catalogue_grants g ON g.id = s.grant_id
    WHERE s.session_hash = ?
  `).bind(sessionHash).first();
  const grant = rowToGrant(row);
  if (!validGrant(grant, now) || Date.parse(row?.session_expires_at || "") <= now.getTime()) return null;
  if (grant.listingCode && grant.listingCode !== text(code).toUpperCase()) return null;
  const packageKey = packageKeyFor(code, grant.inventoryVersion);
  if (!packageKey) return null;
  const object = includeObject ? await env.PHOTO_PACKAGES.get(packageKey) : await env.PHOTO_PACKAGES.head(packageKey);
  if (!isWatermarkedPackage(object, text(code).toUpperCase(), grant.inventoryVersion)) return null;
  return { grant, packageKey, object };
}

export async function revokeCatalogueGrant({ env, id, createdBy }) {
  requireBindings(env);
  const result = await env.PHOTO_GRANTS_DB.prepare(`
    UPDATE photo_catalogue_grants SET revoked_at = ?
    WHERE id = ? AND created_by = ? AND revoked_at IS NULL
  `).bind(new Date().toISOString(), id, normalizeEmail(createdBy)).run();
  return Number(result?.meta?.changes || 0) > 0;
}
