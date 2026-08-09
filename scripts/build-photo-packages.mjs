import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import sharp from "sharp";
import { inspectPublicImage } from "./image-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const outputDir = path.join(projectRoot, "artifacts", "photo-packages");
const inventory = JSON.parse(fs.readFileSync(path.join(publicRoot, "data", "inventory.json"), "utf8"));
const watermarkVersion = "trr-hs-ong-v1";
const watermarkSvg = (width, height) => `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><style>.title{font:600 ${Math.max(22, Math.round(width * .035))}px Arial}.sub{font:500 ${Math.max(15, Math.round(width * .021))}px Arial}</style><text x="50%" y="48%" text-anchor="middle" fill="white" fill-opacity=".28" class="title">TRR HS Ong</text><text x="50%" y="55%" text-anchor="middle" fill="white" fill-opacity=".28" class="sub">property.myeviv.com</text></svg>`;

if (!outputDir.startsWith(`${projectRoot}${path.sep}`)) throw new Error("Package output escaped the project directory.");
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

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
    const metadata = await sharp(sourcePath).metadata();
    const watermarked = await sharp(sourcePath).composite([{ input: Buffer.from(watermarkSvg(metadata.width, metadata.height)), blend: "over" }]).webp({ quality: 82, effort: 4 }).toBuffer();
    zipEntries[path.basename(sourcePath)] = new Uint8Array(watermarked);
  }
  zipEntries["README.txt"] = strToU8(`Sanitized public property photos\nListing: ${listing.code}\nTitle: ${listing.title}\nGenerated from catalogue inventory ${inventory.inventoryVersion}\n`);

  const zipBytes = zipSync(zipEntries, { level: 0 });
  const fileName = `${listing.code}-sanitized-photos.zip`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, zipBytes);
  packages.push({
    code: listing.code,
    title: listing.title,
    fileName,
    objectKey: `packages/${listing.code}.zip`,
    bytes: zipBytes.byteLength,
    sha256: crypto.createHash("sha256").update(zipBytes).digest("hex"),
    fileCount: publicPaths.length,
    customMetadata: { sanitized: "true", watermarked: "true", watermarkVersion, smiCode: listing.code, inventoryVersion: inventory.inventoryVersion, title: listing.title },
  });
}

const manifest = {
  schema: "propertydealdesk-private-photo-packages",
  schema_version: "1.0",
  inventoryVersion: inventory.inventoryVersion,
  generatedAt: new Date().toISOString(),
  packages,
};
fs.writeFileSync(path.join(outputDir, "upload-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${packages.length} private sanitized ZIP packages in ${outputDir}.`);
