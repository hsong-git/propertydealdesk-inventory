const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const text = (value) => typeof value === "string" ? value.trim() : "";

export function normalizePhotoGrantStatus(payload, token, now = new Date()) {
  if (!TOKEN_PATTERN.test(token) || payload?.available !== true) return null;
  const expiresAt = text(payload.expiresAt);
  if (payload.scope !== "catalogue") return null;
  if (!expiresAt || Date.parse(expiresAt) <= now.getTime()) return null;
  return {
    scope: "catalogue",
    inventoryVersion: text(payload.inventoryVersion),
    expiresAt,
  };
}
