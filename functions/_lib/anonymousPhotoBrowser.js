const COOKIE_NAME = "pd_photo_anon";
const COOKIE_TTL = 90 * 24 * 60 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// This identifier is for grouping audit events only, never authentication.
// Store a hash in the audit rather than the browser's cookie value.
export async function anonymousPhotoBrowser(request) {
  const cookies = (request.headers.get("cookie") || "").split(";");
  const value = cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  const token = UUID_PATTERN.test(value || "") ? value.toLowerCase() : crypto.randomUUID();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const id = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { id, cookie: `${COOKIE_NAME}=${token}; Path=/api/photo-share/; Max-Age=${COOKIE_TTL}; HttpOnly; SameSite=Strict${secure}` };
}
