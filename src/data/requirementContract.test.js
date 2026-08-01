import assert from "node:assert/strict";
import test from "node:test";
import { COUNTRY_OPTIONS, emptyRequirement, formatRequirementDate, formatRequirementReference, formatRoomSummary, isValidBudgetAmount, isValidMobileNumber, normalizeBudgetAmount, normalizeMobileNumber, parseRequirementDate, validateRequirementPayload } from "./requirementContract.js";

const validBase = (intent) => ({
  ...emptyRequirement(), intent, consent: true, idempotencyKey: "12345678-1234-1234-1234-123456789012",
  profile: { name: "Test User", mobile: "012-345 6789", race: "Chinese", raceOther: "", country: "Malaysia", occupation: "Manager", companyName: "Example Sdn Bhd" },
  requirements: { ...emptyRequirement().requirements, propertyType: "Condominium", area: "Klang", budget: "2500", bedrooms: "3", bathrooms: "2", relationship: "Family", otherNeeds: "Near school" },
});

test("validates the exact required Rent fields", () => {
  const payload = validBase("rent");
  Object.assign(payload.requirements, { moveInDate: "2026-09-01", peopleStaying: "4", pet: "No", furnishing: "Partial", tenancy: "Individual", tenancyPeriod: "2 years", depositAgreement: "Yes" });
  const result = validateRequirementPayload(payload);
  assert.equal(result.valid, true);
  assert.equal(result.value.requirements.peopleStaying, 4);
});

test("requires Other race details and all Buy choices", () => {
  const payload = validBase("buy");
  payload.profile.race = "Others";
  Object.assign(payload.requirements, { purchaseTimeline: "Within 6 months", purpose: "Own Stay", loan: "Loan Required", occupants: "3" });
  let result = validateRequirementPayload(payload);
  assert.equal(result.valid, false);
  assert.equal(result.errors["profile.raceOther"], "This field is required.");
  payload.profile.raceOther = "Eurasian";
  result = validateRequirementPayload(payload);
  assert.equal(result.valid, true);
});

test("requires race selection and accepts every listed race", () => {
  const payload = validBase("buy");
  Object.assign(payload.requirements, { purchaseTimeline: "Within 6 months", purpose: "Own Stay", loan: "Loan Required", occupants: "3" });
  payload.profile.race = "";
  assert.equal(Boolean(validateRequirementPayload(payload).errors["profile.race"]), true);
  for (const race of ["Malay", "Chinese", "Indian"]) {
    payload.profile.race = race;
    assert.equal(validateRequirementPayload(payload).valid, true, race);
  }
});

test("requires and preserves Other country and race details", () => {
  const payload = validBase("buy");
  Object.assign(payload.requirements, { purchaseTimeline: "Within 6 months", purpose: "Own Stay", loan: "Loan Required", occupants: "3" });
  payload.profile.country = "Other";
  payload.profile.race = "Others";
  let result = validateRequirementPayload(payload);
  assert.equal(result.valid, false);
  assert.equal(result.errors["profile.countryOther"], "This field is required.");
  assert.equal(result.errors["profile.raceOther"], "This field is required.");
  payload.profile.countryOther = "Argentina";
  payload.profile.raceOther = "Mestizo";
  result = validateRequirementPayload(payload);
  assert.equal(result.valid, true);
  assert.equal(result.value.profile.countryOther, "Argentina");
  assert.equal(result.value.profile.raceOther, "Mestizo");
});

test("formats requirement references and rooms in R then B order", () => {
  assert.equal(formatRequirementReference("WTR", 1), "WTR000001");
  assert.equal(formatRequirementReference("WTB", 42), "WTB000042");
  assert.equal(formatRoomSummary(4, 3), "4R 3B");
  assert.equal(formatRoomSummary("", ""), "");
  assert.equal(formatRoomSummary(4, 3).includes("3B 4R"), false);
});

test("accepts and normalizes local and international mobile formats", () => {
  const examples = [
    ["012-345 6789", "+60123456789", "Malaysia"],
    ["+1 (415) 555-2671", "+14155552671", "United States"],
    ["+44 20 7946 0958", "+442079460958", "United Kingdom"],
    ["+65 8123 4567", "+6581234567", "Singapore"],
    ["0044 20 7946 0958", "+442079460958", "United Kingdom"],
  ];
  for (const [formatted, canonical, country] of examples) {
    assert.equal(isValidMobileNumber(formatted), true, formatted);
    assert.equal(normalizeMobileNumber(formatted, country), canonical);
  }
});

test("defaults the applicant country to Malaysia and supports changing country context", () => {
  assert.equal(emptyRequirement().profile.country, "Malaysia");
  assert.equal(COUNTRY_OPTIONS.some(([name, code]) => name === "United States" && code === "+1"), true);
  assert.equal(normalizeMobileNumber("415 555 2671", "United States"), "+14155552671");
  assert.equal(normalizeMobileNumber("0812 3456 789", "Indonesia"), "+628123456789");
});

test("uses the requested defaults for rent and buy requirements", () => {
  const rent = emptyRequirement("rent").requirements;
  assert.deepEqual({ bedrooms: rent.bedrooms, bathrooms: rent.bathrooms, peopleStaying: rent.peopleStaying, pet: rent.pet, furnishing: rent.furnishing, tenancy: rent.tenancy, tenancyPeriod: rent.tenancyPeriod, relationship: rent.relationship }, { bedrooms: 1, bathrooms: 1, peopleStaying: 1, pet: "No", furnishing: "Basic", tenancy: "Individual", tenancyPeriod: "1 year", relationship: "Family" });
  const buy = emptyRequirement("buy").requirements;
  assert.equal(buy.pet, "");
  assert.equal(buy.furnishing, "");
  assert.equal(buy.tenancy, "");
  assert.equal(buy.tenancyPeriod, "");
  assert.equal(buy.relationship, "");
  assert.equal(buy.bedrooms, 1);
  assert.equal(buy.bathrooms, 1);
  assert.equal(buy.occupants, 1);
  assert.equal(buy.purpose, "Own Stay");
  assert.equal(buy.loan, "Loan Required");
});

test("requires a country value without rejecting legacy non-empty country names", () => {
  const payload = validBase("buy");
  Object.assign(payload.requirements, { purchaseTimeline: "Within 6 months", purpose: "Own Stay", loan: "Loan Required", occupants: "3" });
  payload.profile.country = "";
  const result = validateRequirementPayload(payload);
  assert.equal(result.errors["profile.country"], "This field is required.");
});

test("rejects malformed, short, overlong, and letter-containing mobile values", () => {
  for (const value of ["123456", "+", "+01 2345678", "+1 415 555 ABCD", "1234567890123456", "000000000"]) {
    assert.equal(isValidMobileNumber(value), false, value);
  }
});

test("accepts bounded positive custom budgets and rejects invalid amounts", () => {
  assert.equal(isValidBudgetAmount("2750"), true);
  assert.equal(isValidBudgetAmount("750000"), true);
  for (const value of ["", "0", "-1", "abc", "1e12", null]) assert.equal(isValidBudgetAmount(value), false, String(value));
  const payload = validBase("rent");
  Object.assign(payload.requirements, { moveInDate: "2026-09-01", peopleStaying: "4", pet: "No", furnishing: "Partial", tenancy: "Individual", tenancyPeriod: "2 years", depositAgreement: "Yes", budget: "0" });
  const result = validateRequirementPayload(payload);
  assert.equal(Boolean(result.errors["requirements.budget"]), true);
});

test("requires storeys for every property request", () => {
  const payload = validBase("buy");
  Object.assign(payload.requirements, { propertyType: "Terrace House", storeys: "", purchaseTimeline: "Within 6 months", purpose: "Own Stay", loan: "Loan Required" });
  let result = validateRequirementPayload(payload);
  assert.equal(result.valid, false);
  assert.equal(result.errors["requirements.storeys"], "This field is required.");
  payload.requirements.storeys = 2;
  result = validateRequirementPayload(payload);
  assert.equal(result.valid, true);
  assert.equal(result.value.requirements.storeys, 2);
});

test("normalizes the Rent RM35000 typo to an unambiguous RM3500 amount", () => {
  assert.equal(normalizeBudgetAmount("rent", "35000"), 3500);
  assert.equal(normalizeBudgetAmount("buy", "35000"), 35000);
  assert.equal(normalizeBudgetAmount("rent", "3500"), 3500);
});

test("parses and formats dd/mm/yyyy dates, including leap dates", () => {
  assert.equal(parseRequirementDate("31/12/2026"), "2026-12-31");
  assert.equal(parseRequirementDate("29/02/2028"), "2028-02-29");
  assert.equal(formatRequirementDate("2026-09-01"), "01/09/2026");
  for (const value of ["31/02/2026", "29/02/2027", "1/1/2026", "31/13/2026", "not-a-date"]) assert.equal(parseRequirementDate(value), null, value);
});
