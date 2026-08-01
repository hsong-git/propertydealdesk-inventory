import assert from "node:assert/strict";
import test from "node:test";
import { matchRequirements } from "./requirementMatching.js";

const listing = (code, intent, overrides = {}) => ({ code, publicId: code, slug: code.toLowerCase(), intent, location: "Klang", propertyType: "Condominium", price: 2000, bedrooms: 3, bathrooms: 2, furnishing: "Partial", updatedAt: "2026-08-01", createdAt: "2026-08-01", ...overrides });

test("matches only the corresponding published supply intent and caps results at six", () => {
  const submission = { intent: "rent", requirements: { area: "Klang", propertyType: "Condo", budget: 2500, bedrooms: 3, bathrooms: 2, furnishing: "Partial" } };
  const listings = [listing("WTS0001", "WTS"), ...Array.from({ length: 8 }, (_, index) => listing(`WTL000${index}`, "WTL"))];
  const matches = matchRequirements(submission, listings, undefined, 20);
  assert.equal(matches.length, 6);
  assert.equal(matches.every((item) => item.intent === "WTL"), true);
});

test("prioritizes location, property type and in-budget inventory", () => {
  const submission = { intent: "buy", requirements: { area: "Klang", propertyType: "Condominium", budget: 500000, bedrooms: 3, bathrooms: 2 } };
  const matches = matchRequirements(submission, [
    listing("WTS0002", "WTS", { location: "Shah Alam", propertyType: "Terrace", price: 700000 }),
    listing("WTS0001", "WTS", { price: 450000 }),
  ]);
  assert.equal(matches[0].code, "WTS0001");
});

test("does not fill results with a different property type or area", () => {
  const submission = { intent: "rent", requirements: { area: "Bayuemas", propertyType: "Terrace House", budget: 2500, bedrooms: 1, bathrooms: 1 } };
  const matches = matchRequirements(submission, [
    listing("WTL0001", "WTL", { location: "Bayuemas", propertyType: "Terrace House" }),
    listing("WTL0002", "WTL", { location: "Bayuemas", propertyType: "Shoplot" }),
    listing("WTL0003", "WTL", { location: "Setia Alam", propertyType: "Terrace House" }),
  ]);
  assert.deepEqual(matches.map((item) => item.code), ["WTL0001"]);
});
