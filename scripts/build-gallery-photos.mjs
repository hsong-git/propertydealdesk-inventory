import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { galleryPhotoUrl } from "../src/utils/galleryPhoto.js";
import { propertyPhotoWatermark } from "../src/config/watermark.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const inventory = JSON.parse(await fs.readFile(path.join(publicRoot, "data/inventory.json"), "utf8"));
const logoPath = path.join(publicRoot, propertyPhotoWatermark.logo);
const logoStat = await fs.stat(logoPath);
const photos = [...new Set(inventory.listings.flatMap((listing) => listing.photos || []))];
let built = 0;
// Sequential processing bounds memory use even with a large inventory.
for (const photo of photos) {
  const output = path.join(publicRoot, galleryPhotoUrl(photo));
  const source = path.join(publicRoot, photo);
  const sourceStat = await fs.stat(source);
  const previous = await fs.stat(output).catch(() => null);
  if (previous && previous.mtimeMs >= Math.max(sourceStat.mtimeMs, logoStat.mtimeMs)) continue;
  const { width, height } = await sharp(source).metadata();
  const margin = Math.round(Math.min(width, height) * 0.03);
  const { data, info } = await sharp(logoPath)
    .resize({ width: Math.max(1, Math.round(width * 0.22)), height: Math.max(1, Math.round(height * 0.18)), fit: "inside" })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * propertyPhotoWatermark.opacity);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp(source).composite([{
    input: data, raw: { width: info.width, height: info.height, channels: 4 },
    left: width - info.width - margin, top: height - info.height - margin,
  }]).webp({ quality: 90, effort: 1 }).toFile(output);
  built += 1;
}
console.log(`Prepared ${photos.length} right-click-saveable watermarked gallery photos (${built} rebuilt).`);
