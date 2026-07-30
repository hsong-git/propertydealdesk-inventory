const LOCATION_DICTIONARY_SCHEMA = "propertydealdesk-public-location-dictionary";

const FALLBACK_AREAS = [
  { label: "Klang", broad: true, aliases: ["klang", "pelangi heights", "regency condominium", "trifolis apartment", "bayu villa"] },
  { label: "Bukit Tinggi", aliases: ["bukit tinggi", "batu nilam", "lotus"] },
  { label: "Bandar Botanic", aliases: ["bandar botanic", "botanic", "jenaris"] },
  { label: "Bayu Perdana", aliases: ["bayu perdana"] },
  { label: "Bandar Parklands", aliases: ["bandar parklands", "parklands", "gravit8", "the tresor"] },
  { label: "Bayuemas", aliases: ["bayuemas", "bayumas", "bayu emas", "setia bayuemas", "laelia"] },
  { label: "Setia Alam", aliases: ["setia alam", "eco ardence", "huni", "sunsuria forum", "trefoil", "edusentral", "princeton", "impian 8"] },
  { label: "Shah Alam", broad: true, aliases: ["shah alam"] },
  { label: "Bandar Bukit Raja", aliases: ["bandar bukit raja", "bukit raja", "serunai"] },
  { label: "Bandar Puteri Klang", aliases: ["bandar puteri", "bandar puteri klang", "jalan gelang"] },
  { label: "Taman Sentosa", aliases: ["taman sentosa"] },
  { label: "Kampung Jawa", aliases: ["kampung jawa"] },
  { label: "Port Klang", aliases: ["port klang", "pendamar", "taman pendamar"] },
  { label: "Telok Gadong", aliases: ["telok gadong", "teluk gadong", "taman sri gadong"] },
  { label: "Klang Jaya", aliases: ["klang jaya"] },
  { label: "Sri Andalas", aliases: ["sri andalas", "andalas"] },
  { label: "Berkeley / Eng Ann", aliases: ["berkeley", "eng ann", "taman rashna"] },
  { label: "Taman Melawis / Teluk Pulai", aliases: ["taman melawis", "teluk pulai", "taman gembira"] },
  { label: "Kapar / Meru", aliases: ["kapar", "meru", "taman seri meru"] },
  { label: "Klang Utama", aliases: ["klang utama"] },
  { label: "Kota Kemuning", aliases: ["kota kemuning", "anggerik tainia"] },
  { label: "Puncak Alam", aliases: ["puncak alam"] },
  { label: "Banting", aliases: ["banting", "jalan bukit perah"] },
  { label: "Seri Kembangan / Serdang", aliases: ["seri kembangan", "serdang", "taman lestari putra"] },
  { label: "Putrajaya", aliases: ["putrajaya"] },
  { label: "Bukit Jalil", aliases: ["bukit jalil"] },
  { label: "Puchong / Kinrara", aliases: ["puchong", "kinrara"] },
  { label: "Cheras", aliases: ["cheras", "kuala lumpur"] },
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const cleanFallbackLabel = (value) => String(value || "")
  .split("|")[0]
  .replace(/\([^)]*\)/g, "")
  .replace(/\b\d+\s+\d+\b/g, "")
  .replace(/\s+/g, " ")
  .replace(/\s+,/g, ",")
  .replace(/,\s*,/g, ",")
  .replace(/,+$/g, "")
  .trim();

const cleanAliasList = (value, label) => [
  label,
  ...(Array.isArray(value) ? value : []),
].map((item) => String(item || "").trim()).filter(Boolean);

export function normalizeLocationDictionary(payload) {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.locations)
      ? payload.locations
      : [];
  if (!Array.isArray(source) || (payload?.schema && payload.schema !== LOCATION_DICTIONARY_SCHEMA)) return FALLBACK_AREAS;
  const seen = new Set();
  const areas = source
    .map((item) => ({
      label: String(item?.label || item?.canonical || item?.name || "").trim(),
      aliases: cleanAliasList(item?.aliases || item?.keywords, item?.label || item?.canonical || item?.name),
      broad: item?.broad === true || item?.is_broad === true,
      cluster: String(item?.cluster || item?.parent || "").trim(),
    }))
    .filter((area) => area.label && area.aliases.length)
    .filter((area) => {
      const key = area.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return areas.length ? areas : FALLBACK_AREAS;
}

export const fallbackLocationDictionary = FALLBACK_AREAS;

export function canonicalLocationsForListing(listing, dictionary = FALLBACK_AREAS) {
  const raw = [listing.location, listing.title, listing.description].filter(Boolean).join(" ");
  const normalized = normalize(raw);
  const areas = normalizeLocationDictionary(dictionary);
  const matches = areas
    .filter((area) => area.aliases.some((alias) => normalized.includes(normalize(alias))))
    .map((area) => area.label);

  if (matches.length) return matches;
  const fallback = cleanFallbackLabel(listing.location);
  return fallback ? [fallback] : [];
}

export function buildLocationOptions(listings, dictionary = FALLBACK_AREAS) {
  const areas = normalizeLocationDictionary(dictionary);
  const available = new Set();
  for (const listing of listings || []) {
    for (const location of canonicalLocationsForListing(listing, areas)) available.add(location);
  }
  return [
    ...areas.map((area) => area.label).filter((label) => available.has(label)),
    ...[...available].filter((label) => !areas.some((area) => area.label === label)).sort((a, b) => a.localeCompare(b)),
  ];
}

export function matchesLocationFilter(listing, selectedLocation, dictionary = FALLBACK_AREAS) {
  if (!selectedLocation) return true;
  return canonicalLocationsForListing(listing, dictionary).includes(selectedLocation);
}

export function isBroadLocationLabel(label, dictionary = FALLBACK_AREAS) {
  const area = normalizeLocationDictionary(dictionary).find((item) => item.label === label);
  return area?.broad === true;
}

export function matchesKeywordSearch(listing, keyword) {
  const term = String(keyword || "").trim().toLowerCase();
  if (!term) return true;
  const searchable = [
    listing.code,
    listing.title,
    listing.propertyType,
    listing.location,
    listing.description,
    ...(listing.features || []),
  ].join(" ").toLowerCase();
  return searchable.includes(term);
}
