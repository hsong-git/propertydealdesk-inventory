import { propertyPhotoWatermark } from "../config/watermark.js";
import { SITE_ORIGIN } from "./seo.js";

export const PHOTO_SHARE_JPEG_QUALITY = 0.9;

export const nativeShareErrorMessage = (error) => error?.name === "AbortError"
  ? ""
  : "Unable to prepare these photos for sharing.";

const cleanCode = (code) => String(code || "listing").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-");

export function photoShareFileName(code, index) {
  return `${cleanCode(code)}-photo-${String(index + 1).padStart(2, "0")}.jpg`;
}

export function photoShareMessage(listing) {
  return `${listing.code} — ${listing.title}\n${SITE_ORIGIN}/i/${String(listing.code || "").toUpperCase()}`;
}

export function desktopWhatsAppUrl(client, message) {
  const encoded = encodeURIComponent(message);
  return client === "app" ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`;
}

async function decodeImage(blob) {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Photo could not be decoded.")); };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Photo conversion failed.")), "image/jpeg", PHOTO_SHARE_JPEG_QUALITY));
}

export async function createWatermarkedJpegFile(photoUrl, { code, index, fetcher = fetch } = {}) {
  const response = await fetcher(new URL(photoUrl, window.location.origin), { cache: "force-cache" });
  if (!response.ok) throw new Error("Photo unavailable.");
  const source = await decodeImage(await response.blob());
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error("Photo dimensions are unavailable.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo conversion is unavailable in this browser.");
  context.drawImage(source, 0, 0, width, height);

  const titleSize = Math.max(24, Math.min(82, Math.round(Math.min(width, height) * 0.065)));
  const subtitleSize = Math.max(15, Math.round(titleSize * 0.56));
  const lineGap = Math.round(titleSize * 0.18);
  const groupHeight = titleSize + lineGap + subtitleSize;
  const titleY = (height - groupHeight) / 2 + titleSize / 2;
  const subtitleY = titleY + titleSize / 2 + lineGap + subtitleSize / 2;

  context.save();
  context.globalAlpha = propertyPhotoWatermark.opacity;
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${titleSize}px Arial, sans-serif`;
  context.fillText(propertyPhotoWatermark.lines.title, width / 2, titleY);
  context.font = `600 ${subtitleSize}px Arial, sans-serif`;
  context.fillText(propertyPhotoWatermark.lines.subtitle, width / 2, subtitleY);
  context.restore();
  source.close?.();

  return new File([await canvasBlob(canvas)], photoShareFileName(code, index), { type: "image/jpeg", lastModified: Date.now() });
}

export function downloadPreparedFiles(files) {
  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, index * 180);
  });
}
