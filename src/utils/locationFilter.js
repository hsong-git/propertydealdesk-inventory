const CANONICAL_AREAS = [
  { label: "Klang", aliases: ["klang", "pelangi heights", "regency condominium", "trifolis apartment", "bayu villa"] },
  { label: "Bukit Tinggi", aliases: ["bukit tinggi", "batu nilam", "lotus"] },
  { label: "Bandar Botanic", aliases: ["bandar botanic", "botanic", "jenaris"] },
  { label: "Bayu Perdana", aliases: ["bayu perdana"] },
  { label: "Bandar Parklands", aliases: ["bandar parklands", "parklands", "gravit8", "the tresor"] },
  { label: "Bayuemas", aliases: ["bayuemas", "bayumas", "bayu emas", "setia bayuemas", "laelia"] },
  { label: "Setia Alam", aliases: ["setia alam", "eco ardence", "huni", "sunsuria forum", "trefoil", "edusentral", "princeton", "impian 8"] },
  { label: "Shah Alam", aliases: ["shah alam"] },
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

export function canonicalLocationsForListing(listing) {
  const raw = [listing.location, listing.title, listing.description].filter(Boolean).join(" ");
  const normalized = normalize(raw);
  const matches = CANONICAL_AREAS
    .filter((area) => area.aliases.some((alias) => normalized.includes(normalize(alias))))
    .map((area) => area.label);

  if (matches.length) return matches;
  const fallback = cleanFallbackLabel(listing.location);
  return fallback ? [fallback] : [];
}

export function buildLocationOptions(listings) {
  const available = new Set();
  for (const listing of listings || []) {
    for (const location of canonicalLocationsForListing(listing)) available.add(location);
  }
  return [
    ...CANONICAL_AREAS.map((area) => area.label).filter((label) => available.has(label)),
    ...[...available].filter((label) => !CANONICAL_AREAS.some((area) => area.label === label)).sort((a, b) => a.localeCompare(b)),
  ];
}

export function matchesLocationFilter(listing, selectedLocation) {
  if (!selectedLocation) return true;
  return canonicalLocationsForListing(listing).includes(selectedLocation);
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
