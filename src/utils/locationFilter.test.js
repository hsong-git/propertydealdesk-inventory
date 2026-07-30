import assert from "node:assert/strict";
import test from "node:test";
import { buildLocationOptions, canonicalLocationsForListing, matchesKeywordSearch, matchesLocationFilter } from "./locationFilter.js";

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
