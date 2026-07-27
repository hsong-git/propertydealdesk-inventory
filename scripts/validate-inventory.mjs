import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { inspectPublicImage } from "./image-policy.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(projectRoot, "public", "data");
const requestedInventoryPath = process.argv[2];
const inventoryPath = requestedInventoryPath
  ? path.resolve(projectRoot, requestedInventoryPath)
  : path.join(dataDirectory, "inventory.json");
const schemaPath = path.join(dataDirectory, "inventory.schema.json");
const grantsPath = path.join(dataDirectory, "download-grants.json");
const grantsSchemaPath = path.join(dataDirectory, "download-grants.schema.json");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const grants = JSON.parse(fs.readFileSync(grantsPath, "utf8"));
const grantsSchema = JSON.parse(fs.readFileSync(grantsSchemaPath, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const validateGrants = ajv.compile(grantsSchema);

if (!validate(inventory)) {
  console.error("Inventory schema validation failed:");
  for (const error of validate.errors || []) {
    console.error(`- ${error.instancePath || "/"}: ${error.message}`);
  }
  process.exit(1);
}

if (!validateGrants(grants)) {
  console.error("Download-grant schema validation failed:");
  for (const error of validateGrants.errors || []) console.error(`- ${error.instancePath || "/"}: ${error.message}`);
  process.exit(1);
}

const grantTokens = new Set();
for (const grant of grants.grants) {
  if (grantTokens.has(grant.token)) throw new Error(`Duplicate download-grant token: ${grant.token}`);
  grantTokens.add(grant.token);
  if (grant.token.toLowerCase().includes(grant.smi_code.toLowerCase())) throw new Error(`Download token must not contain its SMI code: ${grant.smi_code}`);
  const expectedPrefix = `/downloads/${grant.token}/`;
  if (!grant.package_path.startsWith(expectedPrefix)) throw new Error(`Download package for ${grant.smi_code} must start with ${expectedPrefix}`);
  const packagePath = path.join(projectRoot, "public", grant.package_path.replace(/^\//, ""));
  if (!fs.existsSync(packagePath)) throw new Error(`Missing authorized download package: ${grant.package_path}`);
  if (grant.expires_at && new Date(grant.expires_at).getTime() <= Date.now()) throw new Error(`Expired download grant must be removed before build: ${grant.smi_code}`);
}

const publicIds = new Set();
const slugs = new Set();
const missingPhotos = [];
const referencedPhotos = new Set();

for (const listing of inventory.listings) {
  const publicId = listing.public_id || listing.publicId || listing.code;
  if (publicIds.has(publicId)) throw new Error(`Duplicate public identity: ${publicId}`);
  if (slugs.has(listing.slug)) throw new Error(`Duplicate slug: ${listing.slug}`);
  publicIds.add(publicId);
  slugs.add(listing.slug);
  const photos = [listing.cover_photo, ...(listing.photos || [])].filter(Boolean);
  for (const photo of new Set(photos)) {
    referencedPhotos.add(photo);
    const photoPath = path.join(projectRoot, "public", photo.replace(/^\//, ""));
    if (!fs.existsSync(photoPath)) missingPhotos.push(photo);
  }
}

if (missingPhotos.length) throw new Error(`Missing public photo assets: ${missingPhotos.join(", ")}`);

const metadataFailures = [];
const dimensionFailures = [];
const formatFailures = [];
const oversizedPhotos = [];
let totalPhotoBytes = 0;
for (const photo of referencedPhotos) {
  const photoPath = path.join(projectRoot, "public", photo.replace(/^\//, ""));
  const details = inspectPublicImage(photoPath);
  totalPhotoBytes += details.bytes;
  if (details.metadata.length) metadataFailures.push(`${photo} (${details.metadata.join(", ")})`);
  if (details.width == null || details.height == null || details.width > 2560 || details.height > 2560) {
    dimensionFailures.push(`${photo} (${details.width || "?"}x${details.height || "?"})`);
  }
  if (!inventory.isMockData && details.format !== "webp") formatFailures.push(`${photo} (${details.format})`);
  if (details.bytes > 2 * 1024 * 1024) oversizedPhotos.push(`${photo} (${(details.bytes / 1024 / 1024).toFixed(2)} MiB)`);
}

if (metadataFailures.length) throw new Error(`Public images must contain no EXIF/GPS/device/date/ICC/XMP metadata:\n${metadataFailures.join("\n")}`);
if (dimensionFailures.length) throw new Error(`Public display images must be readable and no larger than 2560px on either edge:\n${dimensionFailures.join("\n")}`);
if (formatFailures.length) throw new Error(`Stable production display images must be WebP:\n${formatFailures.join("\n")}`);
if (oversizedPhotos.length) console.warn(`Warning: public images larger than 2 MiB:\n${oversizedPhotos.join("\n")}`);
if (totalPhotoBytes > 150 * 1024 * 1024) console.warn(`Warning: referenced image package is ${(totalPhotoBytes / 1024 / 1024).toFixed(1)} MiB (recommended maximum: 150 MiB).`);

if (!inventory.isMockData) {
  if (!inventory.publishedAt) throw new Error("A Stable production export requires publishedAt.");
  for (const listing of inventory.listings) {
    if (!["WTS", "WTL"].includes(listing.intent)) {
      throw new Error(`Production export contains non-supply intent ${listing.intent} for ${listing.code}.`);
    }
    const expectedPrefix = `/inventory/${listing.code}/`;
    const photos = [listing.cover_photo, ...(listing.photos || [])].filter(Boolean);
    const invalidPath = photos.find((photo) => !photo.startsWith(expectedPrefix));
    if (invalidPath) throw new Error(`Photo path for ${listing.code} must start with ${expectedPrefix}: ${invalidPath}`);
    if (listing.cover_photo && listing.photos[0] !== listing.cover_photo) {
      throw new Error(`photos[0] must equal cover_photo for ${listing.code}.`);
    }
  }
}

console.log(`Inventory valid: ${inventory.listings.length} ${inventory.isMockData ? "development placeholder" : "published Stable"} listings, ${referencedPhotos.size} metadata-free display images (${(totalPhotoBytes / 1024 / 1024).toFixed(1)} MiB), schema ${inventory.schema_version}, version ${inventory.inventoryVersion}.`);
console.log(`Download grants valid: ${grants.grants.length} active unlisted grant${grants.grants.length === 1 ? "" : "s"}.`);
