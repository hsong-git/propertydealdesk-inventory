const CONTRACT_SCHEMA = "propertydealdesk-public-inventory";
const SUPPORTED_SCHEMA_VERSIONS = new Set(["1", "1.0", "1.1"]);
const SUPPLY_INTENTS = new Set(["WTS", "WTL"]);
const MOCK_INTENTS = new Set(["WTS", "WTL"]);
const PUBLIC_AVAILABILITY = new Set([
  "Available",
  "Available Soon",
  "Viewing by Appointment",
  "Under Offer",
  "Reserved",
]);

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null);
const cleanText = (value, fallback = "") => String(firstValue(value, fallback)).trim();
const cleanNullableText = (value) => {
  const cleaned = cleanText(value);
  return cleaned || null;
};
const cleanNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const cleanInteger = (value) => {
  const number = cleanNumber(value);
  return number === null ? null : Math.round(number);
};
const cleanStringList = (value) => Array.isArray(value)
  ? value.map((item) => cleanText(item)).filter(Boolean)
  : [];
const slugify = (value) => cleanText(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function normalizePhotoPaths(raw, code, isMockData) {
  const photoList = firstValue(raw.photos, raw.photo_paths, raw.photoPaths, []);
  const candidates = [firstValue(raw.cover_photo, raw.coverPhoto), ...(Array.isArray(photoList) ? photoList : [])]
    .filter((value) => value !== undefined && value !== null);
  const productionPrefix = `/inventory/${code}/`.toLowerCase();
  return [...new Set(candidates
    .map((photo) => cleanText(typeof photo === "string" ? photo : firstValue(photo?.publicPath, photo?.public_path, photo?.url)))
    .filter((photo) => {
      const lower = photo.toLowerCase();
      return lower.startsWith(productionPrefix)
        || (isMockData && lower.startsWith("/properties/"));
    }))];
}

export function normalizePublicListing(raw, { isMockData, fallbackTimestamp }) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const code = cleanText(firstValue(raw.code, raw.listingCode, raw.listing_code)).toUpperCase();
  const intent = cleanText(raw.intent).toUpperCase();
  const title = cleanText(raw.title);
  const location = cleanText(raw.location);
  const allowedIntents = isMockData ? MOCK_INTENTS : SUPPLY_INTENTS;
  const availability = cleanText(raw.availability, "Contact for availability");
  if (!code || !allowedIntents.has(intent) || !title || !location) return null;
  if (!isMockData && !PUBLIC_AVAILABILITY.has(availability)) return null;

  const updatedAt = cleanText(firstValue(raw.updatedAt, raw.updated_at, fallbackTimestamp));
  const createdAt = cleanText(firstValue(raw.createdAt, raw.created_at, updatedAt));
  const slug = slugify(firstValue(raw.slug, `${code}-${title}-${location}`));

  // This returned object is the complete browser-visible allowlist. Unknown
  // source keys—including internal notes, contacts and database IDs—are dropped.
  return {
    publicId: cleanText(firstValue(raw.publicId, raw.public_id, code)),
    code,
    slug,
    intent,
    title,
    propertyType: cleanText(firstValue(raw.propertyType, raw.property_type), "Property"),
    location,
    price: cleanNumber(raw.price),
    bedrooms: cleanInteger(firstValue(raw.bedrooms, raw.bedroom_count)),
    bathrooms: cleanInteger(firstValue(raw.bathrooms, raw.bathroom_count)),
    builtUpSqFt: cleanInteger(firstValue(raw.builtUpSqFt, raw.built_up_sqft, raw.unit_size)),
    landSize: cleanNullableText(firstValue(raw.landSize, raw.land_size)),
    furnishing: cleanText(raw.furnishing, "Not specified"),
    facing: cleanNullableText(firstValue(raw.facing, raw.facing_direction)),
    unitType: cleanNullableText(firstValue(raw.unitType, raw.unit_type)),
    availability,
    featured: raw.featured === true,
    createdAt,
    updatedAt,
    photos: normalizePhotoPaths(raw, code, isMockData),
    postingCopy: cleanNullableText(firstValue(raw.postingCopy, raw.posting_copy)),
    description: cleanText(raw.description, "Contact HS Ong for current public listing details."),
    features: cleanStringList(raw.features),
    amenities: cleanStringList(raw.amenities),
    whyThisProperty: cleanStringList(firstValue(raw.whyThisProperty, raw.why_this_property)),
  };
}

export function normalizeInventoryFeed(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The public inventory file is not a valid JSON object.");
  }
  const schema = cleanText(firstValue(payload.schema, payload.feedType));
  const schemaVersion = cleanText(firstValue(payload.schema_version, payload.schemaVersion));
  if (schema !== CONTRACT_SCHEMA || !SUPPORTED_SCHEMA_VERSIONS.has(schemaVersion)) {
    throw new Error("The public inventory uses an unsupported export format.");
  }

  const generatedAt = cleanText(firstValue(payload.generated_at, payload.generatedAt));
  const publishedAt = cleanText(firstValue(payload.publishedAt, payload.published_at, generatedAt));
  const isMockData = payload.isMockData === true || payload.is_mock_data === true;
  const inventoryVersion = cleanText(firstValue(
    payload.inventoryVersion,
    payload.inventory_version,
    generatedAt,
    "unversioned",
  ));
  const items = (Array.isArray(payload.listings) ? payload.listings : [])
    .map((listing) => normalizePublicListing(listing, { isMockData, fallbackTimestamp: publishedAt || generatedAt }))
    .filter(Boolean);

  return {
    items,
    meta: {
      schema,
      schemaVersion,
      inventoryVersion,
      generatedAt,
      publishedAt,
      isMockData,
      notice: cleanText(payload.notice),
    },
  };
}

export const inventoryContract = {
  schema: CONTRACT_SCHEMA,
  supportedSchemaVersions: [...SUPPORTED_SCHEMA_VERSIONS],
};
