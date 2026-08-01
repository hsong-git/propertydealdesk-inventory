const MOBILE_OR_TABLET_USER_AGENT = /Android|iPhone|iPod|iPad|Mobile|Tablet|Windows Phone/i;

export function normalizeWhatsAppNumber(number) {
  const digits = String(number || "").replace(/\D/g, "");
  if (/^0?1\d{8,9}$/.test(digits)) return `60${digits.replace(/^0/, "")}`;
  if (/^601\d{8,9}$/.test(digits)) return digits;
  return "";
}

export function isMobileOrTabletDevice(context = globalThis) {
  const userAgent = String(context?.navigator?.userAgent || "");
  const platform = String(context?.navigator?.platform || "");
  const touchPoints = Number(context?.navigator?.maxTouchPoints || 0);
  const iPadOs = platform === "MacIntel" && touchPoints > 1;
  if (MOBILE_OR_TABLET_USER_AGENT.test(userAgent) || iPadOs) return true;
  try {
    return Boolean(context?.matchMedia?.("(pointer: coarse)")?.matches && touchPoints > 0);
  } catch {
    return false;
  }
}

export function buildWhatsAppUrl(phone, message, { desktop = false } = {}) {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return "";
  const text = message ? `${desktop ? "&" : "?"}text=${encodeURIComponent(message)}` : "";
  return desktop
    ? `https://web.whatsapp.com/send?phone=${normalized}${text}`
    : `https://wa.me/${normalized}${text}`;
}

export function openWhatsApp({ phone, message, opener = globalThis.open, deviceContext = globalThis, onError } = {}) {
  const desktop = !isMobileOrTabletDevice(deviceContext);
  const url = buildWhatsAppUrl(phone, message, { desktop });
  if (!url) {
    onError?.("Unable to open WhatsApp because the contact number is invalid.");
    return { opened: false, desktop, url: "" };
  }
  const target = desktop ? "propertydealdesk-whatsapp-business" : "_blank";
  const features = desktop ? undefined : "noopener,noreferrer";
  const popup = opener?.(url, target, features);
  if (!popup) {
    onError?.(desktop
      ? "Unable to open WhatsApp Business Web. Please allow pop-ups for PropertyDealDesk and try again."
      : "Unable to open WhatsApp. Please allow pop-ups for PropertyDealDesk and try again.");
    return { opened: false, desktop, url };
  }
  popup.focus?.();
  return { opened: true, desktop, url };
}
