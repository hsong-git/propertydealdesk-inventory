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

test("scores related listings by intent, location, property type and price", () => {
  const closest = listing({ code: "WTS0002" });
  const differentIntent = listing({ code: "WTL0003", intent: "WTL" });
  const differentArea = listing({ code: "WTS0004", location: "Setia Alam Shah Alam" });
  const differentType = listing({ code: "WTS0005", propertyType: "Condominium" });
  const farPrice = listing({ code: "WTS0006", price: 1600000 });

  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentIntent));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentArea));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentType));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, farPrice));
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
