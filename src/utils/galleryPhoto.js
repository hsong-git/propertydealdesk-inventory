// Versioned derivatives contain the logo in the pixels, not a CSS overlay.
export const GALLERY_WATERMARK_VERSION = "color-logo-30-jpg-v3";

export function galleryPhotoUrl(src) {
  if (!/^\/inventory\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.webp$/.test(src || "")) {
    throw new Error("Unsupported gallery photo path.");
  }
  return `/watermarked/${GALLERY_WATERMARK_VERSION}${src.replace(/\.webp$/, ".jpg")}`;
}
