import test from "node:test";
import assert from "node:assert/strict";
import { tenantEligibilityDescription } from "./listing.js";

test("tenant eligibility uses explicit flags and supports existing published copies", () => {
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: false }), "Prefer locals and selective tenant profile only.");
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: true }), "All suitable tenants are welcome.");
  assert.equal(tenantEligibilityDescription({}), "Subject to the owner’s review of the tenant profile.");
  assert.equal(tenantEligibilityDescription({ postingCopy: "*Tenant eligibility*: Selective tenant profile requirements." }), "Prefer locals and selective tenant profile only.");
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: true, postingCopy: "*Tenant eligibility*: Selective tenant profile requirements." }), "All suitable tenants are welcome.");
});
