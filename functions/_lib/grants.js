export const VISITOR_SESSION_COOKIE = "pd_photo_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const GRANT_TTL_SECONDS = 6 * 60 * 60;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const CODE_PATTERN = /^(WTS|WTL)[A-Za-z0-9-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value) => typeof value === "string" ? value.trim() : "";

function requireBindings(env) {
  if (!env?.REQUIREMENTS_DB || !env?.PHOTO_PACKAGES || !String(env.CURRENT_INVENTORY_VERSION || "").trim()) throw new Error("Photo download storage is not configured.");
}

export const normalizeEmail = (value) => text(value).toLowerCase();
export const isEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value));
export const packageKeyFor = (code) => CODE_PATTERN.test(text(code).toUpperCase()) ? `packages/${text(code).toUpperCase()}.zip` : null;

export function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request) {
  const match = (request.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${VISITOR_SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(VISITOR_SESSION_COOKIE.length + 1)) : "";
}

export function visitorSessionCookie(token) {
  return `${VISITOR_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export async function registerPhotoVisitor({ env, name, email, now = new Date() }) {
  requireBindings(env);
  const cleanName = text(name).slice(0, 120);
  const cleanEmail = normalizeEmail(email);
  if (!cleanName || !isEmail(cleanEmail)) return null;
  const existing = await env.REQUIREMENTS_DB.prepare("SELECT id FROM photo_download_visitors WHERE email = ?").bind(cleanEmail).first();
  const visitorId = existing?.id || crypto.randomUUID();
  const timestamp = now.toISOString();
  if (existing) await env.REQUIREMENTS_DB.prepare("UPDATE photo_download_visitors SET name = ?, last_seen_at = ? WHERE id = ?").bind(cleanName, timestamp, visitorId).run();
  else await env.REQUIREMENTS_DB.prepare("INSERT INTO photo_download_visitors (id, name, email, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").bind(visitorId, cleanName, cleanEmail, timestamp, timestamp).run();
  const sessionToken = generateToken();
  await env.REQUIREMENTS_DB.prepare("INSERT INTO photo_download_sessions (token_hash, visitor_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await hashToken(sessionToken), visitorId, timestamp, new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString()).run();
  return { visitorId, name: cleanName, email: cleanEmail, sessionToken };
}

const isWatermarked = (object, code, env) => object?.customMetadata?.sanitized === "true"
  && object.customMetadata?.watermarked === "true"
  && object.customMetadata?.watermarkVersion === "trr-hs-ong-v1"
  && object.customMetadata?.smiCode === code
  && object.customMetadata?.inventoryVersion === String(env.CURRENT_INVENTORY_VERSION);

export async function resolvePhotoDownload({ env, request, code, includeObject = false, now = new Date() }) {
  requireBindings(env);
  const normalizedCode = text(code).toUpperCase();
  const packageKey = packageKeyFor(normalizedCode);
  const sessionToken = cookieValue(request);
  if (!packageKey || !TOKEN_PATTERN.test(sessionToken)) return null;
  const row = await env.REQUIREMENTS_DB.prepare("SELECT s.visitor_id, s.expires_at, v.name, v.email FROM photo_download_sessions s JOIN photo_download_visitors v ON v.id = s.visitor_id WHERE s.token_hash = ?").bind(await hashToken(sessionToken)).first();
  if (!row || Date.parse(row.expires_at) <= now.getTime()) return null;
  const object = includeObject ? await env.PHOTO_PACKAGES.get(packageKey) : await env.PHOTO_PACKAGES.head(packageKey);
  if (!isWatermarked(object, normalizedCode, env)) return null;
  return { packageKey, object, visitor: row, code: normalizedCode };
}

// Legacy owner-generated links are retained as a neutral compatibility path for old tests/snapshots;
// the public UI no longer creates or exposes them.
export async function createPhotoGrant({ env, code, email, origin, now = new Date() }) {
  if (!env?.PHOTO_GRANTS || !env?.PHOTO_PACKAGES || !packageKeyFor(code)) return null;
  const object = await env.PHOTO_PACKAGES.head(packageKeyFor(code));
  if (object?.customMetadata?.sanitized !== "true" || object.customMetadata.smiCode !== text(code).toUpperCase() || object.customMetadata.inventoryVersion !== String(env.CURRENT_INVENTORY_VERSION)) return null;
  const token = generateToken(); const tokenHash = await hashToken(token); const expiresAt = new Date(now.getTime() + GRANT_TTL_SECONDS * 1000).toISOString();
  await env.PHOTO_GRANTS.put(`photo-grant:${tokenHash}`, JSON.stringify({ code: text(code).toUpperCase(), packageKey: packageKeyFor(code), title: object.customMetadata.title || `${code} sanitized photo package`, createdBy: normalizeEmail(email), createdAt: now.toISOString(), expiresAt }), { expirationTtl: GRANT_TTL_SECONDS });
  return { code: text(code).toUpperCase(), token, expiresAt, url: `${origin}/download/${token}` };
}

export async function resolvePhotoGrant({ env, token, now = new Date() }) {
  if (!env?.PHOTO_GRANTS || !TOKEN_PATTERN.test(token)) return null;
  const record = await env.PHOTO_GRANTS.get(`photo-grant:${await hashToken(token)}`, "json");
  if (!record || Date.parse(record.expiresAt) <= now.getTime()) return null;
  const object = await env.PHOTO_PACKAGES.head(record.packageKey);
  if (object?.customMetadata?.sanitized !== "true" || object.customMetadata.smiCode !== record.code || object.customMetadata.inventoryVersion !== String(env.CURRENT_INVENTORY_VERSION)) return null;
  return { record, object };
}
