import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost } from "./requirements.js";
import { onRequestGet as getAdminRequirements } from "./admin/requirements/index.js";
import { onRequestPatch as patchAdminRequirement } from "./admin/requirements/[reference].js";
import { emptyRequirement } from "../../src/data/requirementContract.js";

test("public submission rejects cross-origin requests before database access", async () => {
  const request = new Request("https://inventory.example/api/requirements", { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: "{}" });
  const response = await onRequestPost({ request, env: {} });
  assert.equal(response.status, 403);
});

test("public submission returns field errors and does not continue", async () => {
  const request = new Request("https://inventory.example/api/requirements", { method: "POST", headers: { origin: "https://inventory.example", "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: "12345678-1234-1234-1234-123456789012" }) });
  const response = await onRequestPost({ request, env: { REQUIREMENTS_DB: { prepare() { return { bind() { return { first: async () => null }; } }; } } } });
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(Boolean(payload.fields.intent), true);
});

test("public submission reports a friendly database-unavailable state", async () => {
  const payload = emptyRequirement("rent");
  payload.consent = true;
  payload.idempotencyKey = "12345678-1234-1234-1234-123456789012";
  payload.profile = { ...payload.profile, name: "Test User", mobile: "0123456789", race: "Chinese", country: "Malaysia", occupation: "Manager", companyName: "Example Sdn Bhd" };
  payload.requirements = { ...payload.requirements, propertyType: "Condominium", area: "Klang", budget: 2500, moveInDate: "01/09/2026", peopleStaying: 2, depositAgreement: "Yes" };
  const response = await onRequestPost({ request: new Request("https://inventory.example/api/requirements", { method: "POST", headers: { origin: "https://inventory.example", "content-type": "application/json" }, body: JSON.stringify(payload) }), env: {} });
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.match(result.error, /requirements database/i);
});

test("requirement admin endpoints fail closed for public callers", async () => {
  const getResponse = await getAdminRequirements({ request: new Request("https://inventory.example/api/admin/requirements"), env: {} });
  assert.equal(getResponse.status, 403);
  const patchResponse = await patchAdminRequirement({ request: new Request("https://inventory.example/api/admin/requirements/WTR000001", { method: "PATCH", headers: { origin: "https://inventory.example" }, body: "{}" }), params: { reference: "WTR000001" }, env: {} });
  assert.equal(patchResponse.status, 403);
});
