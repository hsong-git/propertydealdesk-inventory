import assert from "node:assert/strict";
import test from "node:test";
import { matchesSelection, normalizeMultiFilters, readFilterParams, selectedValues, writeFilterParams } from "./multiSelect.js";
import { buildLocationOptions, canonicalLocationsForListing, matchesKeywordSearch, matchesLocationFilter, normalizeLocationDictionary } from "./locationFilter.js";

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
