export const GRANT_TTL_SECONDS = 6 * 60 * 60;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const PACKAGE_CODE_PATTERN = /^(WTS|WTL)[A-Za-z0-9-]+$/;

function requireBindings(env) {
  if (!env.PHOTO_GRANTS || !env.PHOTO_PACKAGES || !String(env.CURRENT_INVENTORY_VERSION || "").trim()) {
    throw new Error("Photo grant storage is not configured.");
  }
}

const isCurrentSanitizedPackage = (object, code, env) => object
  && object.customMetadata?.sanitized === "true"
  && object.customMetadata?.smiCode === code
  && object.customMetadata?.inventoryVersion === String(env.CURRENT_INVENTORY_VERSION);

export function packageKeyFor(code) {
  if (!PACKAGE_CODE_PATTERN.test(code)) return null;
  return `packages/${code}.zip`;
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

export async function createPhotoGrant({ env, code, email, origin, now = new Date() }) {
  requireBindings(env);
  const packageKey = packageKeyFor(code);
  if (!packageKey) return null;

  const object = await env.PHOTO_PACKAGES.head(packageKey);
  if (!isCurrentSanitizedPackage(object, code, env)) return null;

  const token = generateGrantToken();
  const tokenHash = await hashGrantToken(token);
  const expiresAt = new Date(now.getTime() + GRANT_TTL_SECONDS * 1000).toISOString();
  const record = {
    code,
    packageKey,
    title: object.customMetadata?.title || `${code} sanitized photo package`,
    createdBy: email,
    createdAt: now.toISOString(),
    expiresAt,
  };
  await env.PHOTO_GRANTS.put(`photo-grant:${tokenHash}`, JSON.stringify(record), { expirationTtl: GRANT_TTL_SECONDS });
  return { code, token, expiresAt, url: `${origin}/download/${token}` };
}

export async function resolvePhotoGrant({ env, token, now = new Date(), includeObject = false }) {
  requireBindings(env);
  if (!TOKEN_PATTERN.test(token)) return null;
  const tokenHash = await hashGrantToken(token);
  const record = await env.PHOTO_GRANTS.get(`photo-grant:${tokenHash}`, "json");
  if (!record || !packageKeyFor(record.code) || record.packageKey !== packageKeyFor(record.code)) return null;
  if (!record.expiresAt || Date.parse(record.expiresAt) <= now.getTime()) return null;

  const object = includeObject
    ? await env.PHOTO_PACKAGES.get(record.packageKey)
    : await env.PHOTO_PACKAGES.head(record.packageKey);
  if (!isCurrentSanitizedPackage(object, record.code, env)) return null;
  return { record, object };
}
