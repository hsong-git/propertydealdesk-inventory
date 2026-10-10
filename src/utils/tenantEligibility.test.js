import test from "node:test";
import assert from "node:assert/strict";
import { tenantEligibilityDescription, tenantEligibilitySummary } from "./listing.js";
import { renderCatalogueContent } from "../../scripts/catalogue-html.mjs";

test("tenant eligibility uses explicit flags and supports existing published copies", () => {
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: false }), "Prefer locals and selective tenant profile only.");
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: true }), "All suitable tenants are welcome.");
  assert.equal(tenantEligibilityDescription({}), "Subject to the owner’s review of the tenant profile.");
  assert.equal(tenantEligibilityDescription({ postingCopy: "*Tenant eligibility*: Selective tenant profile requirements." }), "Prefer locals and selective tenant profile only.");
  assert.equal(tenantEligibilityDescription({ acceptAllRaces: true, postingCopy: "*Tenant eligibility*: Selective tenant profile requirements." }), "All suitable tenants are welcome.");
});

test("rental cards show short eligibility for SMI and CMI but sale-only cards do not", () => {
  for (const visibility of ["listed", "unlisted"]) {
    assert.equal(tenantEligibilitySummary({ intent: "WTL", visibility, acceptAllRaces: false }), "Locals preferred · selective profile");
    assert.equal(tenantEligibilitySummary({ intent: "WTS", alternateIntent: "WTL", visibility, acceptAllRaces: true }), "All suitable tenants welcome");
    assert.equal(tenantEligibilitySummary({ intent: "WTL", visibility }), "Subject to owner review");
  }
  assert.equal(tenantEligibilitySummary({ intent: "WTS" }), null);
  const listing = { intent: "WTL", code: "WTL0001", slug: "unit", title: "Unit", location: "Klang", propertyType: "Condo", availability: "Available", photos: [], acceptAllRaces: false, createdAt: "2026-10-10" };
  assert.match(renderCatalogueContent([listing]), /property-tenant-eligibility[\s\S]*Locals preferred · selective profile/);
});
