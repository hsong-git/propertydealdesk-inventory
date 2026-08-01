import assert from "node:assert/strict";
import test from "node:test";
import { emptyRequirement } from "../../src/data/requirementContract.js";
import { createRequirement } from "./requirements.js";

const validRent = () => ({
  ...emptyRequirement(), intent: "rent", consent: true, idempotencyKey: "12345678-1234-1234-1234-123456789012",
  profile: { name: "Test User", mobile: "0123456789", race: "Chinese", raceOther: "", country: "Malaysia", occupation: "Manager", companyName: "Example Sdn Bhd" },
  requirements: { ...emptyRequirement().requirements, propertyType: "Condominium", area: "Klang", budget: 2500, bedrooms: 3, bathrooms: 2, relationship: "Family", moveInDate: "2026-09-01", peopleStaying: 4, pet: "No", furnishing: "Partial", tenancy: "Individual", tenancyPeriod: "2 years", depositAgreement: "Yes" },
});

function fakeDatabase() {
  const state = { counters: { WTR: 0, WTB: 0 }, byKey: new Map(), lastInsert: null };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes("SELECT reference")) return state.byKey.get(args[0]) || null;
              if (sql.includes("UPDATE requirement_counters")) return { value: ++state.counters[args[0]] };
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO property_requirements")) { state.lastInsert = args; state.byKey.set(args[10], { reference: args[0] }); }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

test("allocates a unique reference once and returns the saved reference for duplicate submits", async () => {
  const database = fakeDatabase();
  const env = { REQUIREMENTS_DB: database };
  const now = new Date("2026-08-01T10:00:00.000Z");
  const created = await createRequirement(env, validRent(), now);
  const duplicate = await createRequirement(env, validRent(), now);
  assert.deepEqual(created, { reference: "WTR000001", submittedAt: now.toISOString(), duplicate: false });
  assert.deepEqual(duplicate, { reference: "WTR000001", duplicate: true });
  assert.equal(database.state.counters.WTR, 1);
});

test("enforces international mobile validation server-side and stores the canonical number", async () => {
  const invalid = validRent();
  invalid.profile.mobile = "+1 415 555 ABCD";
  const invalidResult = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, invalid, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(invalidResult.validationErrors["profile.mobile"], "Enter a valid mobile number, including the country code where needed.");

  const database = fakeDatabase();
  const international = validRent();
  international.profile.mobile = "+1 (415) 555-2671";
  const created = await createRequirement({ REQUIREMENTS_DB: database }, international, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(created.reference, "WTR000001");
  assert.equal(database.state.lastInsert[4], "+14155552671");
});

test("rejects invalid custom budget amounts before database access", async () => {
  for (const budget of ["", "0", "-1", "not-a-number", "1000000001"]) {
    const payload = validRent();
    payload.requirements.budget = budget;
    const result = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, payload, new Date("2026-08-01T10:00:00.000Z"));
    assert.equal(Boolean(result.validationErrors["requirements.budget"]), true, budget);
  }
});

test("enforces dd/mm/yyyy move-in dates server-side", async () => {
  const valid = validRent();
  valid.requirements.moveInDate = "29/02/2028";
  const created = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, valid, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(created.reference, "WTR000001");
  const invalid = validRent();
  invalid.requirements.moveInDate = "31/02/2026";
  const rejected = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, invalid, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(Boolean(rejected.validationErrors["requirements.moveInDate"]), true);
});

test("enforces Other country and race details server-side", async () => {
  const invalid = validRent();
  invalid.profile.country = "Other";
  invalid.profile.race = "Others";
  const rejected = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, invalid, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(Boolean(rejected.validationErrors["profile.countryOther"]), true);
  assert.equal(Boolean(rejected.validationErrors["profile.raceOther"]), true);
  const valid = validRent();
  valid.profile.country = "Other";
  valid.profile.countryOther = "Argentina";
  valid.profile.race = "Others";
  valid.profile.raceOther = "Mestizo";
  const created = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, valid, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(created.reference, "WTR000001");
});

test("rejects a missing race server-side", async () => {
  const payload = validRent();
  payload.profile.race = "";
  const rejected = await createRequirement({ REQUIREMENTS_DB: fakeDatabase() }, payload, new Date("2026-08-01T10:00:00.000Z"));
  assert.equal(Boolean(rejected.validationErrors["profile.race"]), true);
});
