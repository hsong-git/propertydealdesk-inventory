const SITE_ORIGIN = "https://property.myeviv.com";
const AGENT_TOOLS_URL = "https://agenttools.myeviv.com/";
const WHATSAPP = "60163132865";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function noStoreHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "content-type": contentType,
    "cache-control": "no-store, max-age=0, must-revalidate",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
}

export function renderUnavailableShortcutHtml(code = "") {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const title = "This property is no longer available";
  const message = normalizedCode
    ? `Hi HS Ong, I opened listing ${normalizedCode} on your Property Inventory, but it appears to be no longer available.%0A%0ACan you share any similar current listings?`
    : "Hi HS Ong, I opened a property listing on your Property Inventory, but it appears to be no longer available.%0A%0ACan you share any similar current listings?";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | HS Ong Property Inventory</title>
    <meta name="robots" content="noindex, follow" />
    <meta name="description" content="This property may already be sold, rented, withdrawn, or no longer available in HS Ong Property Inventory." />
    <link rel="canonical" href="${SITE_ORIGIN}/" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #17231f; background: #f7faf8; }
      body { margin: 0; min-height: 100vh; background: #f7faf8; }
      a { color: inherit; }
      .header, .footer { border-bottom: 1px solid #d8e1dc; background: #fff; }
      .footer { border-top: 1px solid #d8e1dc; border-bottom: 0; }
      .wrap { width: min(960px, calc(100% - 48px)); margin: 0 auto; }
      .header-inner, .footer-inner { min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
      .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font-weight: 800; }
      .brand img { width: 42px; height: 42px; object-fit: contain; }
      .brand small { display: block; margin-top: 2px; color: #63716b; font-weight: 500; }
      .nav { display: flex; gap: 18px; color: #53615b; font-weight: 700; font-size: 14px; }
      .nav a { text-decoration: none; }
      main { min-height: calc(100vh - 166px); display: grid; place-items: center; padding: 52px 0; }
      .card { width: min(760px, 100%); border: 1px solid #cfe5dc; border-radius: 18px; background: linear-gradient(135deg, #ffffff 0%, #f0fbf7 100%); box-shadow: 0 22px 58px rgba(21, 82, 61, 0.11); padding: clamp(28px, 5vw, 52px); text-align: center; box-sizing: border-box; }
      .icon { width: 58px; height: 58px; margin: 0 auto 18px; border-radius: 16px; display: grid; place-items: center; background: #e1f4ed; color: #087a5f; font-size: 28px; }
      .eyebrow { display: block; color: #087a5f; font-size: 12px; line-height: 1; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 14px 0 12px; font-size: clamp(30px, 5vw, 48px); line-height: 1.05; letter-spacing: 0; }
      p { margin: 0 auto; max-width: 590px; color: #5d6b65; font-size: 17px; line-height: 1.65; }
      .code { display: inline-flex; margin: 20px 0 0; padding: 8px 13px; border-radius: 999px; background: #fff; border: 1px solid #cfe5dc; color: #087a5f; font-weight: 900; }
      .actions { margin-top: 28px; display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
      .button { min-height: 46px; padding: 0 18px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; text-decoration: none; font-weight: 850; border: 1px solid #c9d7d1; background: #fff; }
      .button.primary { color: #fff; background: #0c8768; border-color: #0c8768; box-shadow: 0 12px 30px rgba(12, 135, 104, 0.2); }
      .note { margin-top: 18px; font-size: 14px; color: #6b7872; }
      .footer-inner { align-items: flex-start; padding: 24px 0; color: #5c6964; font-size: 13px; }
      .footer strong { display: block; color: #17231f; font-size: 15px; margin-bottom: 6px; }
      @media (max-width: 620px) {
        .wrap { width: min(100% - 28px, 960px); }
        .header-inner { min-height: 62px; }
        .nav { display: none; }
        main { min-height: calc(100vh - 138px); padding: 28px 0; }
        .card { border-radius: 14px; padding: 28px 20px; }
        .actions { display: grid; }
        .button { width: 100%; box-sizing: border-box; }
        .footer-inner { display: block; }
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="wrap header-inner">
        <a class="brand" href="/">
          <img src="/propertydealdesk-logo.png" alt="PropertyDealDesk" />
          <span>PropertyDealDesk Inventory<small>HS Ong &middot; REN 81340</small></span>
        </a>
        <nav class="nav" aria-label="Main navigation">
          <a href="/">Properties</a>
          <a href="/about">About Me</a>
          <a href="/contact">Contact</a>
          <a href="${AGENT_TOOLS_URL}">Agent Tools</a>
        </nav>
      </div>
    </header>
    <main>
      <div class="wrap">
        <section class="card" aria-labelledby="unavailable-title">
          <span class="icon" aria-hidden="true">!</span>
          <span class="eyebrow">Listing unavailable</span>
          <h1 id="unavailable-title">${title}</h1>
          <p>This property may already be sold, rented, withdrawn, or no longer available in the public catalogue.</p>
          ${normalizedCode ? `<span class="code">${escapeHtml(normalizedCode)}</span>` : ""}
          <div class="actions">
            <a class="button primary" href="/">Browse current listings</a>
            <a class="button" href="https://wa.me/${WHATSAPP}?text=${message}" target="_blank" rel="noopener noreferrer">Contact HS Ong</a>
          </div>
          <p class="note">For similar properties, check the latest active listings or contact HS Ong directly.</p>
        </section>
      </div>
    </main>
    <footer class="footer">
      <div class="wrap footer-inner">
        <div><strong>HS Ong Property Inventory</strong>Real Estate Negotiator &middot; REN 81340</div>
        <nav class="nav" aria-label="Footer navigation">
          <a href="/">Properties</a>
          <a href="/about">About Me</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </footer>
  </body>
</html>`;
}

async function readInventory(env, request) {
  const response = await env.ASSETS.fetch(new Request(new URL("/data/inventory.json", request.url)));
  if (!response.ok) return null;
  return response.json();
}

function withNoStore(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function onRequestGet({ env, params, request }) {
  const code = String(params.code || "").trim().toUpperCase();

  try {
    const inventory = await readInventory(env, request);
    const listing = inventory?.listings?.find((item) => String(item.code || "").toUpperCase() === code);
    if (listing) {
      const page = await env.ASSETS.fetch(new Request(new URL(`/i/${encodeURIComponent(listing.code)}/index.html`, request.url)));
      if (page.ok) return withNoStore(page);
    }
  } catch {
    // Fall through to the unavailable page; deleted short links must fail soft.
  }

  return new Response(renderUnavailableShortcutHtml(code), {
    status: 404,
    headers: noStoreHeaders(),
  });
}

export const onRequest = (context) => context.request.method === "GET"
  ? onRequestGet(context)
  : new Response("Method Not Allowed", { status: 405, headers: { allow: "GET" } });
