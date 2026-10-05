export function anonymousBrowserLabel(id) {
  return /^[0-9a-f]{64}$/i.test(String(id || "")) ? `ANON-${id.slice(0, 16).toUpperCase()}` : "—";
}
