import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestPost } from "./requirements.js";
import { onRequestGet as getAdminRequirements } from "./admin/requirements/index.js";
import { onRequestPatch as patchAdminRequirement } from "./admin/requirements/[reference].js";
import { emptyRequirement } from "../../src/data/requirementContract.js";

function archiveFixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../migrations/0001_property_requirements.sql", import.meta.url), "utf8"));
  for (const [reference, intent, status] of [["WTR000001", "rent", "unread"], ["WTB000001", "buy", "read"]]) {
    db.prepare("INSERT INTO property_requirements (reference, submitted_at, intent, status, name, mobile, area, budget, profile_json, requirements_json, idempotency_key, consented_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(reference, "2026-10-05T00:00:00Z", intent, status, "QA inquiry", "0123456789", "Klang", 1500, '{"name":"QA inquiry"}', '{"area":"Klang"}', reference, "2026-10-05T00:00:00Z");
  }
  db.exec(readFileSync(new URL("../../migrations/0007_archive_inquiries.sql", import.meta.url), "utf8"));
  const env = { REQUIREMENTS_DB: { prepare(sql) { return { bind(...values) { return {
    async run() { return { meta: db.prepare(sql).run(...values) }; },
    async all() { return { results: db.prepare(sql).all(...values) }; },
    async first() { return db.prepare(sql).get(...values) || null; },
  }; } }; } } };
  return { db, env };
}

const archiveRequest = (reference, payload, origin = "http://localhost") => ({
  request: new Request(`http://localhost/api/admin/requirements/${reference}`, { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(payload) }),
  params: { reference },
});

test("Rent and Buy inquiries archive and restore without changing details, read status or references", async () => {
  const { db, env } = archiveFixture();
  try {
    for (const reference of ["WTR000001", "WTB000001"]) {
      const before = db.prepare("SELECT * FROM property_requirements WHERE reference = ?").get(reference);
      const archived = await patchAdminRequirement({ ...archiveRequest(reference, { archived: true }), env });
      assert.equal(archived.status, 200);
      assert.ok((await archived.json()).archivedAt);
      const after = db.prepare("SELECT * FROM property_requirements WHERE reference = ?").get(reference);
      assert.deepEqual({ ...after, archived_at: null }, { ...before });
      const active = await getAdminRequirements({ request: new Request("http://localhost/api/admin/requirements"), env });
      assert.ok(!(await active.json()).submissions.some((item) => item.reference === reference));
      const archiveList = await getAdminRequirements({ request: new Request("http://localhost/api/admin/requirements?view=archived"), env });
      assert.ok((await archiveList.json()).submissions.some((item) => item.reference === reference && item.archivedAt));
      assert.equal((await patchAdminRequirement({ ...archiveRequest(reference, { archived: false }), env })).status, 200);
      assert.deepEqual(db.prepare("SELECT * FROM property_requirements WHERE reference = ?").get(reference), before);
    }
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM property_requirements").get().count, 2);
    assert.equal(db.prepare("SELECT SUM(value) AS total FROM requirement_counters").get().total, 0);
  } finally { db.close(); }
});

test("archive API validates mutations and rejects cross-origin changes", async () => {
  const { db, env } = archiveFixture();
  try {
    for (const payload of [{ archived: "true" }, { archived: true, status: "read" }, {}]) {
      assert.equal((await patchAdminRequirement({ ...archiveRequest("WTR000001", payload), env })).status, 400);
    }
    assert.equal((await patchAdminRequirement({ ...archiveRequest("WTR000001", { archived: true }, "https://attacker.example"), env })).status, 403);
    assert.equal((await patchAdminRequirement({ ...archiveRequest("WTR999999", { archived: true }), env })).status, 404);
    assert.equal((await getAdminRequirements({ request: new Request("http://localhost/api/admin/requirements?view=invalid"), env })).status, 400);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM property_requirements WHERE archived_at IS NOT NULL").get().count, 0);
  } finally { db.close(); }
});

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
