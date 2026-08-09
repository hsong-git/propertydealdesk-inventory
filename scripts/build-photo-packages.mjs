import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { inspectPublicImage } from "./image-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const outputDir = path.join(projectRoot, "artifacts", "photo-packages");
const inventory = JSON.parse(fs.readFileSync(path.join(publicRoot, "data", "inventory.json"), "utf8"));

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
    zipEntries[path.basename(sourcePath)] = new Uint8Array(fs.readFileSync(sourcePath));
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
    customMetadata: { sanitized: "true", smiCode: listing.code, inventoryVersion: inventory.inventoryVersion, title: listing.title },
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
