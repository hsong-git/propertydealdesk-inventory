const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

const text = (value) => typeof value === "string" ? value.trim() : "";

export function normalizeDownloadGrants(payload) {
  if (!payload || payload.schema !== "propertydealdesk-public-download-grants" || payload.schema_version !== "1.0" || !Array.isArray(payload.grants)) return [];
  return payload.grants.flatMap((grant) => {
    const token = text(grant?.token);
    const smiCode = text(grant?.smi_code);
    const packagePath = text(grant?.package_path);
    if (!TOKEN_PATTERN.test(token) || !/^(WTS|WTL)[A-Za-z0-9-]+$/.test(smiCode)) return [];
    if (!packagePath.startsWith(`/downloads/${token}/`) || !packagePath.toLowerCase().endsWith(".zip")) return [];
    return [{
      token,
      smiCode,
      title: text(grant.title) || "Authorized property image package",
      packagePath,
      generatedAt: text(grant.generated_at),
      expiresAt: text(grant.expires_at),
      fileCount: Number.isInteger(grant.file_count) ? grant.file_count : null,
      notice: text(grant.notice),
    }];
  });
}

export function resolveDownloadGrant(payload, token, now = new Date()) {
  const grant = normalizeDownloadGrants(payload).find((item) => item.token === token);
  if (!grant) return null;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() <= now.getTime()) return null;
  return grant;
}
