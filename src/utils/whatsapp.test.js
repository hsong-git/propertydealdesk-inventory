import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppUrl, isMobileOrTabletDevice, normalizeWhatsAppNumber, openWhatsApp } from "./whatsapp.js";

test("normalizes Malaysian mobile numbers", () => {
  assert.equal(normalizeWhatsAppNumber("016 313 2865"), "60163132865");
  assert.equal(normalizeWhatsAppNumber("60163132865"), "60163132865");
  assert.equal(normalizeWhatsAppNumber("03 1234 5678"), "");
});

test("builds desktop WhatsApp Business Web URL", () => {
  assert.equal(buildWhatsAppUrl("0163132865", "Hello HS Ong", { desktop: true }), "https://web.whatsapp.com/send?phone=60163132865&text=Hello%20HS%20Ong");
});

test("detects mobile and iPadOS devices", () => {
  assert.equal(isMobileOrTabletDevice({ navigator: { userAgent: "Mozilla/5.0 Android Mobile", platform: "", maxTouchPoints: 5 } }), true);
  assert.equal(isMobileOrTabletDevice({ navigator: { userAgent: "Mozilla/5.0 Macintosh", platform: "MacIntel", maxTouchPoints: 5 } }), true);
  assert.equal(isMobileOrTabletDevice({ navigator: { userAgent: "Mozilla/5.0 Windows", platform: "Win32", maxTouchPoints: 0 } }), false);
});

test("reuses the named desktop WhatsApp window", () => {
  const calls = [];
  const result = openWhatsApp({
    phone: "0163132865",
    message: "Hello",
    deviceContext: { navigator: { userAgent: "Mozilla/5.0 Windows", platform: "Win32", maxTouchPoints: 0 } },
    opener: (...args) => { calls.push(args); return { focus() {} }; },
  });
  assert.equal(result.opened, true);
  assert.equal(calls[0][1], "propertydealdesk-whatsapp-business");
  assert.equal(calls[0][2], undefined);
});

test("keeps mobile wa.me launch behavior", () => {
  const calls = [];
  openWhatsApp({
    phone: "0163132865",
    message: "Hello",
    deviceContext: { navigator: { userAgent: "Mozilla/5.0 iPhone Mobile", platform: "iPhone", maxTouchPoints: 5 } },
    opener: (...args) => { calls.push(args); return {}; },
  });
  assert.equal(calls[0][0], "https://wa.me/60163132865?text=Hello");
  assert.equal(calls[0][1], "_blank");
});

test("reports invalid numbers and popup blocking", () => {
  const errors = [];
  assert.equal(openWhatsApp({ phone: "03-1234-5678", onError: (message) => errors.push(message) }).opened, false);
  assert.equal(openWhatsApp({ phone: "0163132865", deviceContext: { navigator: { userAgent: "Mozilla/5.0 Windows", platform: "Win32" } }, opener: () => null, onError: (message) => errors.push(message) }).opened, false);
  assert.equal(errors.length, 2);
});
