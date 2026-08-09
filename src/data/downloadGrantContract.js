const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const text = (value) => typeof value === "string" ? value.trim() : "";

export function normalizePhotoGrantStatus(payload, token, now = new Date()) {
  if (!TOKEN_PATTERN.test(token) || payload?.available !== true) return null;
  const code = text(payload.code);
  const expiresAt = text(payload.expiresAt);
  const downloadPath = text(payload.downloadPath);
  if (!/^(WTS|WTL)[A-Za-z0-9-]+$/.test(code)) return null;
  if (!expiresAt || Date.parse(expiresAt) <= now.getTime()) return null;
  if (downloadPath !== `/api/photo-download/${token}`) return null;
  return {
    code,
    title: text(payload.title) || `${code} sanitized photo package`,
    expiresAt,
    downloadPath,
  };
}
