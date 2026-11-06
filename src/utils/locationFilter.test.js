import assert from "node:assert/strict";
import test from "node:test";
import { matchesSelection, normalizeMultiFilters, readFilterParams, selectedValues, writeFilterParams } from "./multiSelect.js";
import { buildLocationOptions, buildLocationCounts, canonicalLocationsForListing, matchesKeywordSearch, matchesLocationFilter, normalizeLocationDictionary } from "./locationFilter.js";
import { matchesCatalogueFilters } from "./catalogueFilter.js";

test("location counts use aliases, count each listing once per area and support empty feeds", () => {
  const dictionary = [{ label: "Botanic", aliases: ["botanic", "jenaris"] }, { label: "Klang", aliases: ["klang"], broad: true }];
  const items = [{ location: "Botanic Jenaris Klang" }, { location: "Jenaris Klang" }, { location: "Unknown Place" }];
  const counts = buildLocationCounts(items, dictionary);
  assert.equal(counts.get("Botanic"), 2);
  assert.equal(counts.get("Klang"), 2);
  assert.equal(counts.get("Unknown Place"), 1);
  assert.equal(buildLocationCounts([], dictionary).size, 0);
  assert.equal(buildLocationCounts(undefined).size, 0);
});

test("location facets respect every other filter, alternate prices and inventory classification", () => {
  const items = [
    { code: "WTL1", intent: "WTL", price: 1600, propertyType: "Terrace", furnishing: "Full", bedrooms: 3, location: "Botanic Klang", featured: true },
    { code: "CMI2", intent: "WTS", price: 600000, alternateIntent: "WTL", alternatePrice: 1800, propertyType: "Terrace", furnishing: "Partial", bedrooms: 4, location: "Jenaris Klang", visibility: "unlisted" },
    { code: "WTS3", intent: "WTS", price: 500000, propertyType: "Condo", furnishing: "Full", bedrooms: 2, location: "Bukit Tinggi", featured: true },
    { code: "WTL4", intent: "WTL", price: 800, propertyType: "Room", furnishing: "Basic", bedrooms: 1, location: "Melawis Klang" },
  ];
  const dictionary = [{ label: "Botanic", aliases: ["botanic", "jenaris"] }, { label: "Klang", aliases: ["klang"], broad: true }];
  const defaults = { intent: "WTL", propertyType: [], furnishing: [], location: [], keyword: "", classification: "", bedrooms: "", minPrice: "", maxPrice: "" };
  const cases = [
    [{}, "all", ["WTL1", "CMI2", "WTL4"]],
    [{ intent: "WTS" }, "all", ["CMI2", "WTS3"]],
    [{ classification: "cmi" }, "all", ["CMI2"]],
    [{ classification: "smi" }, "all", ["WTL1", "WTL4"]],
    [{ minPrice: "1700", maxPrice: "2000" }, "all", ["CMI2"]],
    [{ maxPrice: "1700" }, "all", ["WTL1", "WTL4"]],
    [{ bedrooms: "4" }, "all", ["CMI2"]],
    [{ furnishing: ["Full"] }, "all", ["WTL1"]],
    [{ propertyType: ["Room"] }, "all", ["WTL4"]],
    [{ keyword: "Jenaris" }, "all", ["CMI2"]],
    [{}, "featured", ["WTL1"]],
    [{ keyword: "no matches" }, "all", []],
  ];
  for (const [overrides, mode, expected] of cases) {
    const filters = { ...defaults, ...overrides, location: ["Bukit Tinggi"] };
    const candidates = items.filter(item => matchesCatalogueFilters(item, filters, mode, dictionary, { ignoreLocation: true }));
    assert.deepEqual(candidates.map(item => item.code), expected, JSON.stringify(overrides));
    const counts = buildLocationCounts(candidates, dictionary);
    for (const location of buildLocationOptions(items, dictionary)) {
      const matching = items.filter(item => matchesCatalogueFilters(item, { ...filters, location: [location] }, mode, dictionary));
      assert.equal(counts.get(location) || 0, matching.length, `${JSON.stringify(overrides)} ${location}`);
    }
  }
  assert.equal(items.filter(item => matchesCatalogueFilters(item, { ...defaults, location: ["Botanic", "Klang"] }, "all", dictionary)).length, 3);
});

test("location options normalize duplicated raw Klang variants into one canonical option", () => {
  const options = buildLocationOptions([
    { location: "Klang" },
    { location: "Klang, Selangor" },
    { location: "Regency Condominium, Klang" },
  ]);

  assert.equal(options.filter((option) => option === "Klang").length, 1);
  assert.equal(options.includes("Klang, Selangor"), false);
  assert.equal(options.includes("Regency Condominium, Klang"), false);
});

test("location options sort canonical and fallback labels together alphabetically", () => {
  const dictionary = [
    { label: "Zebra Heights", aliases: ["zebra heights"] },
    { label: "Bandar Botanic", aliases: ["bandar botanic"] },
    { label: "Klang", aliases: ["klang"], broad: true },
  ];
  const listings = ["Zebra Heights", "Klang", "Bandar Botanic", "Alpha Gardens", "Klang"]
    .map((location) => ({ location }));
  assert.deepEqual(buildLocationOptions(listings, dictionary), ["Alpha Gardens", "Bandar Botanic", "Klang", "Zebra Heights"]);
});

test("canonical location selection matches aliases and combined raw locations", () => {
  const listing = {
    title: "Condominium Apartment at Huni Eco Ardence",
    location: "Setia Alam, Shah Alam, Bandar Baru Klang",
    description: "Near Sunsuria Forum",
  };

  assert.deepEqual(canonicalLocationsForListing(listing), ["Klang", "Setia Alam", "Shah Alam"]);
  assert.equal(matchesLocationFilter(listing, "Setia Alam"), true);
  assert.equal(matchesLocationFilter(listing, "Shah Alam"), true);
  assert.equal(matchesLocationFilter(listing, "Bukit Tinggi"), false);
});

test("keyword search still uses raw public location and listing text", () => {
  const listing = {
    code: "WTL0055",
    title: "Condominium Apartment at Huni Eco Ardence",
    propertyType: "Condominium / Apartment",
    location: "Setia Alam, Shah Alam, Bandar Baru Klang",
    description: "Public listing copy",
    features: ["Near Sunsuria Forum"],
  };

  assert.equal(matchesKeywordSearch(listing, "Eco Ardence"), true);
  assert.equal(matchesKeywordSearch(listing, "Bandar Baru Klang"), true);
  assert.equal(matchesKeywordSearch(listing, "Sunsuria"), true);
  assert.equal(matchesKeywordSearch(listing, "Taman Sentosa"), false);
});

test("unknown locations remain available as one cleaned fallback and still filter correctly", () => {
  const listing = {
    title: "Shop Office",
    location: "Desa Unique Heights, Somewhere (public display)",
    description: "",
  };
  const options = buildLocationOptions([listing]);

  assert.deepEqual(options, ["Desa Unique Heights, Somewhere"]);
  assert.equal(matchesLocationFilter(listing, "Desa Unique Heights, Somewhere"), true);
});

test("published location dictionary aliases drive options and matching when provided", () => {
  const dictionary = normalizeLocationDictionary({
    schema: "propertydealdesk-public-location-dictionary",
    schema_version: "1.0",
    locations: [
      { label: "Dictionary Heights", aliases: ["dh residence", "old dh"] },
      { label: "Klang", broad: true, aliases: ["klang"] },
    ],
  });
  const listing = {
    title: "Apartment at DH Residence",
    location: "Old DH, Klang",
    description: "",
  };

  assert.deepEqual(canonicalLocationsForListing(listing, dictionary), ["Dictionary Heights", "Klang"]);
  assert.deepEqual(buildLocationOptions([listing], dictionary), ["Dictionary Heights", "Klang"]);
  assert.equal(matchesLocationFilter(listing, "Dictionary Heights", dictionary), true);
});

test("invalid or absent dictionary falls back to built-in public aliases", () => {
  const listing = {
    title: "Apartment at Huni Eco Ardence",
    location: "Setia Alam",
    description: "",
  };

  assert.deepEqual(canonicalLocationsForListing(listing, { schema: "wrong", locations: [] }), ["Setia Alam"]);
});
test("multi-select filters accept legacy values and match any selected value", () => {
  assert.deepEqual(selectedValues("Full"), ["Full"]);
  assert.deepEqual(selectedValues(["Full", "Full", " Partial ", "", null]), ["Full", "Partial"]);
  assert.equal(matchesSelection("Basic", []), true);
  assert.equal(matchesSelection("Full", ["Full", "Partial"]), true);
  assert.equal(matchesSelection("Basic", ["Full", "Partial"]), false);
  assert.deepEqual(normalizeMultiFilters({ propertyType: "Terrace House", location: "Klang", furnishing: "" }), { propertyType: ["Terrace House"], location: ["Klang"], furnishing: [] });
});

test("shared searches round-trip multiple values without splitting location commas", () => {
  const keys = { propertyType: "type", location: "location", furnishing: "furnishing", intent: "intent" };
  const defaults = { propertyType: [], location: [], furnishing: [], intent: "WTL" };
  const filters = { ...defaults, propertyType: ["Terrace House", "Condominium/Apartment"], location: ["Klang, Selangor", "Setia Alam"], furnishing: ["Full", "Partial"], intent: "WTS" };
  const params = writeFilterParams(filters, keys, defaults);
  assert.deepEqual(params.getAll("location"), filters.location);
  assert.deepEqual(readFilterParams(new URLSearchParams(params.toString()), keys, defaults), filters);
  assert.equal(writeFilterParams(defaults, keys, defaults).toString(), "");
  const legacy = readFilterParams(new URLSearchParams("type=Terrace+House&location=Klang&furnishing=Full"), keys, defaults);
  assert.deepEqual(legacy, { ...defaults, propertyType: ["Terrace House"], location: ["Klang"], furnishing: ["Full"] });
});

test("multiple fields narrow results together and location selections retain alias matching", () => {
  const listings = [
    { propertyType: "Terrace House", furnishing: "Full", location: "Setia Alam, Shah Alam" },
    { propertyType: "Condominium/Apartment", furnishing: "Partial", location: "Klang, Selangor" },
    { propertyType: "Office Lot", furnishing: "Full", location: "Klang" },
    { propertyType: "Terrace House", furnishing: "Basic", location: "Klang" },
  ];
  const types = ["Terrace House", "Condominium/Apartment"];
  const locations = ["Klang", "Setia Alam"];
  const furnishing = ["Full", "Partial"];
  assert.deepEqual(listings.filter((listing) => matchesSelection(listing.propertyType, types)
    && locations.some((location) => matchesLocationFilter(listing, location))
    && matchesSelection(listing.furnishing, furnishing)), listings.slice(0, 2));
});
