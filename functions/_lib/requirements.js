import { formatRequirementReference, validateRequirementPayload } from "../../src/data/requirementContract.js";

export const REQUIREMENT_SELECT = `
  reference, submitted_at, intent, status, name, mobile, area, budget,
  profile_json, requirements_json, other_needs, consented_at, read_at
`;

export const serializeRequirement = (row, { includeDetails = false } = {}) => {
  const base = {
    reference: row.reference,
    submittedAt: row.submitted_at,
    intent: row.intent,
    status: row.status,
    name: row.name,
    mobile: row.mobile,
    area: row.area,
    budget: row.budget,
  };
  if (!includeDetails) return base;
  return {
    ...base,
    profile: JSON.parse(row.profile_json || "{}"),
    requirements: JSON.parse(row.requirements_json || "{}"),
    otherNeeds: row.other_needs || "",
    consentedAt: row.consented_at,
    readAt: row.read_at || null,
  };
};

export async function createRequirement(env, raw, now = new Date()) {
  if (!env?.REQUIREMENTS_DB) throw new Error("Requirements database is not configured.");
  const validated = validateRequirementPayload(raw);
  if (!validated.valid) return { validationErrors: validated.errors };
  const value = validated.value;
  const existing = await env.REQUIREMENTS_DB.prepare("SELECT reference FROM property_requirements WHERE idempotency_key = ?")
    .bind(value.idempotencyKey).first();
  if (existing?.reference) return { reference: existing.reference, duplicate: true };

  const prefix = value.intent === "rent" ? "WTR" : "WTB";
  const counter = await env.REQUIREMENTS_DB.prepare("UPDATE requirement_counters SET value = value + 1 WHERE prefix = ? RETURNING value")
    .bind(prefix).first();
  const reference = formatRequirementReference(prefix, Number(counter?.value));
  if (!reference) throw new Error("Could not allocate a requirement reference.");
  const submittedAt = now.toISOString();
  try {
    await env.REQUIREMENTS_DB.prepare(`
      INSERT INTO property_requirements (
        reference, submitted_at, intent, status, name, mobile, area, budget,
        profile_json, requirements_json, other_needs, idempotency_key, consented_at
      ) VALUES (?, ?, ?, 'unread', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reference, submittedAt, value.intent, value.profile.name, value.profile.mobile,
      value.requirements.area, value.requirements.budget, JSON.stringify(value.profile),
      JSON.stringify(value.requirements), value.requirements.otherNeeds, value.idempotencyKey, submittedAt,
    ).run();
  } catch (error) {
    const duplicate = await env.REQUIREMENTS_DB.prepare("SELECT reference FROM property_requirements WHERE idempotency_key = ?")
      .bind(value.idempotencyKey).first();
    if (duplicate?.reference) return { reference: duplicate.reference, duplicate: true };
    throw error;
  }
  return { reference, submittedAt, duplicate: false };
}

