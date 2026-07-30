import assert from "node:assert/strict";
import test from "node:test";
import { getRelatedListings, relatedListingScore } from "./relatedListings.js";

const current = {
  publicId: "current",
  code: "WTS0001",
  slug: "current-listing",
  intent: "WTS",
  title: "Current Terrace House",
  propertyType: "Terrace House",
  location: "Bukit Tinggi Klang",
  price: 700000,
  updatedAt: "2026-07-29T10:00:00Z",
};

const listing = (overrides) => ({
  publicId: overrides.code,
  slug: `${overrides.code}-slug`,
  title: `${overrides.code} listing`,
  intent: "WTS",
  propertyType: "Terrace House",
  location: "Bukit Tinggi Klang",
  price: 700000,
  updatedAt: "2026-07-29T09:00:00Z",
  createdAt: "2026-07-29T09:00:00Z",
  ...overrides,
});

test("scores related listings with intent ahead of location, type and price", () => {
  const closest = listing({ code: "WTS0002" });
  const differentIntentPerfectMatch = listing({ code: "WTL0003", intent: "WTL" });
  const differentArea = listing({ code: "WTS0004", location: "Setia Alam Shah Alam" });
  const differentType = listing({ code: "WTS0005", propertyType: "Condominium" });
  const farPrice = listing({ code: "WTS0006", price: 1600000 });
  const sameIntentOnly = listing({
    code: "WTS0007",
    propertyType: "Factory / Warehouse",
    location: "Puchong",
    price: 2500000,
  });

  assert.ok(relatedListingScore(current, sameIntentOnly) > relatedListingScore(current, differentIntentPerfectMatch));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentIntentPerfectMatch));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentArea));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentType));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, farPrice));
});

test("within the same intent, normalized location decides before property type", () => {
  const genericKlangOnly = listing({
    code: "WTS0020",
    propertyType: "Factory / Warehouse",
    location: "Klang",
    price: 2500000,
  });
  const specificAreaWrongType = listing({
    code: "WTS0021",
    propertyType: "Factory / Warehouse",
    location: "Bukit Tinggi",
    price: 2500000,
  });
  const sameTypeNoArea = listing({
    code: "WTS0022",
    propertyType: "2 Storey Terrace House",
    location: "Puchong",
    price: 700000,
  });

  assert.ok(relatedListingScore(current, specificAreaWrongType) > relatedListingScore(current, genericKlangOnly));
  assert.ok(relatedListingScore(current, specificAreaWrongType) > relatedListingScore(current, sameTypeNoArea));
});

test("dictionary aliases influence related listing location sorting", () => {
  const dictionary = [
    { label: "Dictionary Heights", aliases: ["dh residence", "old dh"] },
    { label: "Klang", broad: true, aliases: ["klang"] },
  ];
  const dictionaryCurrent = {
    ...current,
    location: "DH Residence, Klang",
    title: "Current Apartment",
    propertyType: "Condominium/Apartment",
  };
  const dictionaryAliasMatch = listing({
    code: "WTS0023",
    location: "Old DH",
    propertyType: "Factory / Warehouse",
    price: 2500000,
  });
  const sameTypeNoDictionaryLocation = listing({
    code: "WTS0024",
    location: "Puchong",
    propertyType: "Condominium",
    price: 700000,
  });

  assert.ok(
    relatedListingScore(dictionaryCurrent, dictionaryAliasMatch, dictionary)
      > relatedListingScore(dictionaryCurrent, sameTypeNoDictionaryLocation, dictionary),
  );
  assert.equal(getRelatedListings(dictionaryCurrent, [sameTypeNoDictionaryLocation, dictionaryAliasMatch], 2, dictionary)[0].code, "WTS0023");
});

test("within the same intent and location tier, property type decides before price", () => {
  const sameTypeFarPrice = listing({
    code: "WTS0030",
    propertyType: "2 Storey Terrace House",
    location: "Puchong",
    price: 2500000,
  });
  const differentTypeClosePrice = listing({
    code: "WTS0031",
    propertyType: "Factory / Warehouse",
    location: "Puchong",
    price: 705000,
  });

  assert.ok(relatedListingScore(current, sameTypeFarPrice) > relatedListingScore(current, differentTypeClosePrice));
});

test("within the same intent, location and property type tier, price similarity decides", () => {
  const closePrice = listing({
    code: "WTS0040",
    location: "Puchong",
    price: 720000,
  });
  const farPrice = listing({
    code: "WTS0041",
    location: "Puchong",
    price: 1600000,
  });

  assert.ok(relatedListingScore(current, closePrice) > relatedListingScore(current, farPrice));
});

test("selects deterministic related listings, excludes current and caps at eight", () => {
  const candidates = [
    current,
    listing({ code: "WTS0010", updatedAt: "2026-07-29T08:00:00Z" }),
    listing({ code: "WTL0001", intent: "WTL", updatedAt: "2026-07-29T12:00:00Z" }),
    listing({ code: "WTS0003", location: "Bukit Tinggi", updatedAt: "2026-07-29T07:00:00Z" }),
    listing({ code: "WTS0002", location: "Bukit Tinggi", updatedAt: "2026-07-29T07:00:00Z" }),
    listing({ code: "WTS0004", propertyType: "Condominium", updatedAt: "2026-07-29T11:00:00Z" }),
    listing({ code: "WTS0005", price: 720000 }),
    listing({ code: "WTS0006", price: 730000 }),
    listing({ code: "WTS0007", price: 740000 }),
    listing({ code: "WTS0008", price: 750000 }),
    listing({ code: "WTS0009", price: 760000 }),
  ];

  const related = getRelatedListings(current, candidates, 8);
  assert.equal(related.length, 8);
  assert.equal(related.some((item) => item.code === current.code), false);
  assert.equal(related[0].code, "WTS0010");
  assert.deepEqual(
    getRelatedListings(current, [
      listing({ code: "WTS0102", updatedAt: "2026-07-29T09:00:00Z" }),
      listing({ code: "WTS0101", updatedAt: "2026-07-29T09:00:00Z" }),
    ]).map((item) => item.code),
    ["WTS0101", "WTS0102"],
  );
});
