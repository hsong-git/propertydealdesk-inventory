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

test("scores related listings with location and property type ahead of intent and price", () => {
  const closest = listing({ code: "WTS0002" });
  const differentIntent = listing({ code: "WTL0003", intent: "WTL" });
  const differentArea = listing({ code: "WTS0004", location: "Setia Alam Shah Alam" });
  const differentType = listing({ code: "WTS0005", propertyType: "Condominium" });
  const farPrice = listing({ code: "WTS0006", price: 1600000 });
  const sameIntentOnly = listing({
    code: "WTS0007",
    propertyType: "Factory / Warehouse",
    location: "Puchong",
    price: 2500000,
  });
  const sameLocationDifferentIntent = listing({
    code: "WTL0008",
    intent: "WTL",
    propertyType: "Factory / Warehouse",
    location: "Bukit Tinggi",
    price: 2500000,
  });
  const sameTypeDifferentIntent = listing({
    code: "WTL0009",
    intent: "WTL",
    propertyType: "2 Storey Terrace House",
    location: "Setia Alam",
    price: 2500000,
  });

  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentIntent));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentArea));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, differentType));
  assert.ok(relatedListingScore(current, closest) > relatedListingScore(current, farPrice));
  assert.ok(relatedListingScore(current, sameLocationDifferentIntent) > relatedListingScore(current, sameIntentOnly));
  assert.ok(relatedListingScore(current, sameTypeDifferentIntent) > relatedListingScore(current, sameIntentOnly));
});

test("prioritizes specific normalized location overlap over generic region matches", () => {
  const genericKlangOnly = listing({
    code: "WTS0020",
    propertyType: "Factory / Warehouse",
    location: "Klang",
    price: 2500000,
  });
  const specificArea = listing({
    code: "WTL0021",
    intent: "WTL",
    propertyType: "Factory / Warehouse",
    location: "Bukit Tinggi",
    price: 2500000,
  });

  assert.ok(relatedListingScore(current, specificArea) > relatedListingScore(current, genericKlangOnly));
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
