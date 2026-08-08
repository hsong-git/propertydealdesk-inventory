import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { strToU8, zipSync } from "fflate";
import { propertyPhotoWatermark } from "../src/config/watermark.js";
import { inspectPublicImage } from "./image-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const outputDir = path.join(projectRoot, "artifacts", "photo-packages");
const inventory = JSON.parse(fs.readFileSync(path.join(publicRoot, "data", "inventory.json"), "utf8"));
const watermarkVersion = "trr-hs-ong-v1";

if (!outputDir.startsWith(`${projectRoot}${path.sep}`)) throw new Error("Package output escaped the project directory.");
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

async function embedWatermark(buffer) {
  const source = sharp(buffer, { failOn: "error" });
  const metadata = await source.metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (!width || !height) throw new Error("Image dimensions are missing.");
  const titleSize = Math.max(28, Math.round(Math.min(width, height) * 0.065));
  const subtitleSize = Math.max(16, Math.round(titleSize * 0.58));
  const center = Math.round(height / 2);
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><g fill="#fff" fill-opacity="0.28" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700"><text x="${Math.round(width / 2)}" y="${center - Math.round(titleSize * 0.12)}" font-size="${titleSize}">${escapeXml(propertyPhotoWatermark.lines.title)}</text><text x="${Math.round(width / 2)}" y="${center + Math.round(subtitleSize * 1.15)}" font-size="${subtitleSize}">${escapeXml(propertyPhotoWatermark.lines.subtitle)}</text></g></svg>`;
  const output = await source
    .rotate()
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const outputMetadata = await sharp(output).metadata();
  if (outputMetadata.format !== "webp" || outputMetadata.exif || outputMetadata.icc || outputMetadata.xmp || outputMetadata.iptc) {
    throw new Error("Watermarked package image retained forbidden metadata.");
  }
  return output;
}

const packages = [];
for (const listing of inventory.listings) {
  const publicPaths = [...new Set([listing.cover_photo, ...(listing.photos || [])].filter(Boolean))];
  if (!publicPaths.length) continue;

  const zipEntries = {};
  for (const publicPath of publicPaths) {
    const sourcePath = path.join(publicRoot, publicPath.replace(/^\//, ""));
    const details = inspectPublicImage(sourcePath);
    if (details.format !== "webp" || details.metadata.length || details.width > 2560 || details.height > 2560) {
      throw new Error(`Unsafe display image cannot enter a download package: ${publicPath}`);
    }
    const watermarked = await embedWatermark(fs.readFileSync(sourcePath));
    zipEntries[path.basename(sourcePath)] = new Uint8Array(watermarked);
  }
  zipEntries["README.txt"] = strToU8(`Sanitized public property photos\nListing: ${listing.code}\nTitle: ${listing.title}\nGenerated from catalogue inventory ${inventory.inventoryVersion}\nWatermark: TRR HS Ong / property.myeviv.com\n`);

  const zipBytes = zipSync(zipEntries, { level: 0 });
  const fileName = `${listing.code}-watermarked-photos.zip`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, zipBytes);
  packages.push({
    code: listing.code,
    title: listing.title,
    fileName,
    objectKey: `packages/${inventory.inventoryVersion}/${listing.code}.zip`,
    bytes: zipBytes.byteLength,
    sha256: crypto.createHash("sha256").update(zipBytes).digest("hex"),
    fileCount: publicPaths.length,
    customMetadata: {
      sanitized: "true",
      watermarked: "true",
      watermarkVersion,
      smiCode: listing.code,
      inventoryVersion: inventory.inventoryVersion,
      title: listing.title,
      photoCount: String(publicPaths.length),
    },
  });
}

const manifest = {
  schema: "propertydealdesk-private-photo-packages",
  schema_version: "2.0",
  inventoryVersion: inventory.inventoryVersion,
  generatedAt: new Date().toISOString(),
  watermark: { version: watermarkVersion, lines: propertyPhotoWatermark.lines, embedded: true },
  packages,
};
fs.writeFileSync(path.join(outputDir, "upload-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${packages.length} private watermarked ZIP packages in ${outputDir}.`);
