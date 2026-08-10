import assert from "node:assert/strict";
import test from "node:test";
import { desktopWhatsAppUrl, nativeShareErrorMessage, PHOTO_SHARE_JPEG_QUALITY, photoShareFileName, photoShareMessage } from "./photoShare.js";

test("prepares standard JPG filenames and listing share copy", () => {
  assert.equal(photoShareFileName("wtl0063", 0), "WTL0063-photo-01.jpg");
  assert.equal(photoShareFileName("wtl0063", 11), "WTL0063-photo-12.jpg");
  assert.equal(PHOTO_SHARE_JPEG_QUALITY, 0.9);
  assert.equal(photoShareMessage({ code: "WTL0063", title: "Setia City Residence" }), "WTL0063 — Setia City Residence\nhttps://property.myeviv.com/i/WTL0063");
});

test("provides explicit WhatsApp App and Web destinations", () => {
  assert.match(desktopWhatsAppUrl("app", "Listing photos"), /^whatsapp:\/\/send\?text=/);
  assert.match(desktopWhatsAppUrl("web", "Listing photos"), /^https:\/\/web\.whatsapp\.com\/send\?text=/);
});

test("does not show a false cancellation after a mobile share target closes", () => {
  assert.equal(nativeShareErrorMessage({ name: "AbortError" }), "");
  assert.equal(nativeShareErrorMessage({ name: "NotAllowedError" }), "Unable to prepare these photos for sharing.");
});
