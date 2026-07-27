export const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  },
});

export const neutralUnavailable = () => json({
  available: false,
  message: "This photo download link is invalid, expired, or no longer available.",
}, 404);

export const methodNotAllowed = (allow) => json({ error: "Method not allowed." }, 405, { allow });

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}
