import { json, methodNotAllowed } from "../_lib/http.js";

const clean = (value, max = 160) => String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
const phonePattern = /^[+0-9][0-9 ()-]{6,24}$/;
const originAllowed = (request) => {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
};

async function notifyTelegram(env, request) {
  const token = String(env.PHOTO_REQUEST_TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.PHOTO_REQUEST_TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chatId) return false;
  const message = ["📸 PHOTO DOWNLOAD REQUEST", `SMI: ${request.listing_code}`, `Property: ${request.listing_title}`, `From: ${request.requester_name}`, `Contact: ${request.requester_phone}`, "Review in Admin → Photo requests."].join("\n");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: message }) });
  return response.ok;
}

export async function onRequestPost(context) {
  if (!originAllowed(context.request)) return json({ error: "Request rejected." }, 403);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const code = clean(body.code, 32).toUpperCase();
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const title = clean(body.title, 180);
  const slug = clean(body.slug, 220);
  if (!/^(WTS|WTL)[A-Z0-9-]+$/.test(code) || !name || !phonePattern.test(phone) || !title || !slug) return json({ error: "Name, contact number and listing details are required." }, 400);
  if (!context.env?.PHOTO_GRANTS_DB) return json({ error: "Photo request storage is not configured." }, 503);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const row = { id, listing_code: code, listing_slug: slug, listing_title: title, requester_name: name, requester_phone: phone };
  await context.env.PHOTO_GRANTS_DB.prepare("INSERT INTO photo_download_requests (id, listing_code, listing_slug, listing_title, requester_name, requester_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, code, slug, title, name, phone, createdAt).run();
  try { if (await notifyTelegram(context.env, row)) await context.env.PHOTO_GRANTS_DB.prepare("UPDATE photo_download_requests SET telegram_notified_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run(); } catch { /* request remains stored for admin review */ }
  return json({ ok: true, message: "Request sent to HS Ong." }, 201);
}

export const onRequest = (context) => context.request.method === "POST" ? onRequestPost(context) : methodNotAllowed("POST");
