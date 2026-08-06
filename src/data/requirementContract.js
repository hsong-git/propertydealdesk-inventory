export const RACE_OPTIONS = ["Malay", "Chinese", "Indian", "Others"];
export const FURNISHING_OPTIONS = ["Basic", "Partial", "Full", "No Preference"];
export const TENANCY_OPTIONS = ["Individual", "Company"];
export const PROPERTY_USAGE_OPTIONS = ["Residential", "Commercial"];
export const DEPOSIT_OPTIONS = ["Yes", "Need to Discuss"];
export const PURPOSE_OPTIONS = ["Own Stay", "Investment", "Both", "Others"];
export const LOAN_OPTIONS = ["Loan Required", "Cash Purchase", "Not Sure"];
export const COUNTRY_OPTIONS = [
  ["Malaysia", "+60"], ["Singapore", "+65"], ["Indonesia", "+62"], ["Thailand", "+66"], ["Philippines", "+63"],
  ["Vietnam", "+84"], ["Brunei", "+673"], ["China", "+86"], ["Hong Kong", "+852"], ["Taiwan", "+886"],
  ["Japan", "+81"], ["South Korea", "+82"], ["India", "+91"], ["Australia", "+61"], ["New Zealand", "+64"],
  ["United States", "+1"], ["Canada", "+1"], ["United Kingdom", "+44"], ["Ireland", "+353"], ["France", "+33"],
  ["Germany", "+49"], ["Italy", "+39"], ["Spain", "+34"], ["Netherlands", "+31"], ["Switzerland", "+41"],
  ["United Arab Emirates", "+971"], ["Saudi Arabia", "+966"], ["Qatar", "+974"], ["South Africa", "+27"],
  ["Brazil", "+55"], ["Mexico", "+52"], ["Other", ""],
];
const COUNTRY_CODES = new Map(COUNTRY_OPTIONS);

const INTENTS = new Set(["rent", "buy"]);
const optionSet = (values) => new Set(values);
const RACES = optionSet(RACE_OPTIONS);
const FURNISHING = optionSet(FURNISHING_OPTIONS);
const TENANCIES = optionSet(TENANCY_OPTIONS);
const PROPERTY_USAGE = optionSet(PROPERTY_USAGE_OPTIONS);
const DEPOSITS = optionSet(DEPOSIT_OPTIONS);
const PURPOSES = optionSet(PURPOSE_OPTIONS);
const LOANS = optionSet(LOAN_OPTIONS);

const cleanText = (value, max = 160) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const cleanMultiline = (value, max = 1000) => String(value ?? "").trim().replace(/\r\n?/g, "\n").slice(0, max);
const cleanNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return integer ? Math.floor(parsed) : parsed;
};
export function parseRequirementDate(value) {
  const raw = String(value ?? "").trim();
  let year; let month; let day;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) [day, month, year] = raw.split("/").map(Number);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) [year, month, day] = raw.split("-").map(Number);
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatRequirementDate(value) {
  const iso = parseRequirementDate(value);
  if (!iso) return String(value ?? "").trim();
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

const MOBILE_ALLOWED = /^[+0-9\s().-]+$/;
export const isValidBudgetAmount = (value) => {
  if (value === "" || value === null || value === undefined || String(value).trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000_000;
};
export const normalizeBudgetAmount = (intent, value) => {
  const parsed = value === "" || value === null || value === undefined ? null : Number(value);
  if (intent === "rent" && parsed === 35000) return 3500;
  return parsed;
};

export function isValidMobileNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 32 || !MOBILE_ALLOWED.test(raw)) return false;
  const openParens = (raw.match(/\(/g) || []).length;
  const closeParens = (raw.match(/\)/g) || []).length;
  if (openParens !== closeParens || /\([^)]*\(/.test(raw) || /\)[^(]*\)/.test(raw)) return false;
  const compact = raw.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return false;
  const international = compact.startsWith("+") || compact.startsWith("00");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : compact;
  if (digits.length < 7 || digits.length > 15 || /^0+$/.test(digits)) return false;
  if (international && digits.startsWith("0")) return false;
  return true;
}

export function normalizeMobileNumber(value, country = "") {
  const raw = String(value ?? "").trim();
  if (!raw || !isValidMobileNumber(raw)) return raw;
  const compact = raw.replace(/[\s().-]/g, "");
  if (compact.startsWith("+")) return `+${compact.slice(1)}`;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  const countryCode = COUNTRY_CODES.get(String(country ?? "").trim());
  if (countryCode) {
    const countryDigits = countryCode.slice(1);
    if (compact.startsWith(countryDigits)) return `+${compact}`;
    return `${countryCode}${compact.startsWith("0") ? compact.slice(1) : compact}`;
  }
  return compact;
}

export const emptyRequirement = (intent = "") => ({
  intent,
  profile: { name: "", mobile: "", race: "", raceOther: "", country: "Malaysia", countryOther: "", occupation: "", companyName: "" },
  requirements: {
    propertyType: "Terrace House", hasStoreys: true, storeys: 1, area: "", budget: "", bedrooms: 1, bathrooms: 1, relationship: intent === "rent" ? "Family" : "", propertyUsage: intent === "rent" ? "Residential" : "", commercialActivity: "", otherNeeds: "",
    moveInDate: "", peopleStaying: intent === "rent" ? 1 : "", pet: intent === "rent" ? "No" : "", furnishing: intent === "rent" ? "Basic" : "", tenancy: intent === "rent" ? "Individual" : "", tenancyPeriod: intent === "rent" ? "1 year" : "", depositAgreement: "",
    purchaseTimeline: "", purpose: intent === "buy" ? "Own Stay" : "", loan: intent === "buy" ? "Loan Required" : "", occupants: intent === "buy" ? 1 : "",
  },
  consent: false,
});

export function normalizeRequirementPayload(raw) {
  const intent = cleanText(raw?.intent, 8).toLowerCase();
  const profile = raw?.profile || {};
  const requirements = raw?.requirements || {};
  return {
    intent,
    profile: {
      name: cleanText(profile.name, 120),
      mobile: normalizeMobileNumber(profile.mobile, profile.country),
      race: cleanText(profile.race, 30),
      raceOther: cleanText(profile.raceOther, 80),
      country: cleanText(profile.country, 80),
      countryOther: cleanText(profile.countryOther, 100),
      occupation: cleanText(profile.occupation, 120),
      companyName: cleanText(profile.companyName, 160),
    },
    requirements: {
      propertyType: cleanText(requirements.propertyType, 120),
      hasStoreys: true,
      storeys: cleanNumber(requirements.storeys, { min: 1, max: 20, integer: true }),
      area: cleanText(requirements.area, 160),
      budget: cleanNumber(normalizeBudgetAmount(intent, requirements.budget), { min: 1, max: 1_000_000_000 }),
      bedrooms: cleanNumber(requirements.bedrooms, { min: 0, max: 100, integer: true }),
      bathrooms: cleanNumber(requirements.bathrooms, { min: 0, max: 100, integer: true }),
      relationship: cleanText(requirements.relationship, 120),
      propertyUsage: intent === "rent" ? cleanText(requirements.propertyUsage || "Residential", 20) : cleanText(requirements.propertyUsage, 20),
      commercialActivity: cleanText(requirements.commercialActivity, 160),
      otherNeeds: cleanMultiline(requirements.otherNeeds),
      moveInDate: parseRequirementDate(requirements.moveInDate) || cleanText(requirements.moveInDate, 16),
      peopleStaying: cleanNumber(requirements.peopleStaying, { min: 1, max: 100, integer: true }),
      pet: cleanText(requirements.pet, 3),
      furnishing: cleanText(requirements.furnishing, 30),
      tenancy: cleanText(requirements.tenancy, 20),
      tenancyPeriod: cleanText(requirements.tenancyPeriod, 80),
      depositAgreement: cleanText(requirements.depositAgreement, 30),
      purchaseTimeline: cleanText(requirements.purchaseTimeline, 80),
      purpose: cleanText(requirements.purpose, 20),
      loan: cleanText(requirements.loan, 30),
      occupants: cleanNumber(requirements.occupants, { min: 1, max: 100, integer: true }),
    },
    consent: raw?.consent === true,
    idempotencyKey: cleanText(raw?.idempotencyKey, 80),
  };
}

export function validateRequirementPayload(raw) {
  const value = normalizeRequirementPayload(raw);
  const errors = {};
  const required = (path, fieldValue) => { if (fieldValue === "" || fieldValue === null) errors[path] = "This field is required."; };

  if (!INTENTS.has(value.intent)) errors.intent = "Choose Rent or Buy.";
  required("profile.name", value.profile.name);
  required("profile.mobile", value.profile.mobile);
  if (value.profile.mobile && !isValidMobileNumber(value.profile.mobile)) errors["profile.mobile"] = "Enter a valid mobile number, including the country code where needed.";
  if (!RACES.has(value.profile.race)) errors["profile.race"] = "Choose a race.";
  if (value.profile.race === "Others") required("profile.raceOther", value.profile.raceOther);
  required("profile.country", value.profile.country);
  if (value.profile.country === "Other") required("profile.countryOther", value.profile.countryOther);
  required("profile.occupation", value.profile.occupation);
  required("profile.companyName", value.profile.companyName);
  required("requirements.propertyType", value.requirements.propertyType);
  required("requirements.storeys", value.requirements.storeys);
  if (value.requirements.storeys !== null && !Number.isInteger(value.requirements.storeys)) errors["requirements.storeys"] = "Choose a valid number of storeys.";
  required("requirements.area", value.requirements.area);
  required("requirements.budget", value.requirements.budget);
  if (value.requirements.budget !== null && !isValidBudgetAmount(value.requirements.budget)) errors["requirements.budget"] = "Enter a valid positive budget amount.";
  required("requirements.bedrooms", value.requirements.bedrooms);
  required("requirements.bathrooms", value.requirements.bathrooms);

  if (value.intent === "rent") {
    if (!PROPERTY_USAGE.has(value.requirements.propertyUsage)) errors["requirements.propertyUsage"] = "Choose Residential or Commercial.";
    if (value.requirements.propertyUsage === "Commercial") required("requirements.commercialActivity", value.requirements.commercialActivity);
    if (!parseRequirementDate(value.requirements.moveInDate)) errors["requirements.moveInDate"] = "Enter a valid date as dd/mm/yyyy.";
    required("requirements.peopleStaying", value.requirements.peopleStaying);
    required("requirements.relationship", value.requirements.relationship);
    if (!new Set(["Yes", "No"]).has(value.requirements.pet)) errors["requirements.pet"] = "Choose Yes or No.";
    if (!FURNISHING.has(value.requirements.furnishing)) errors["requirements.furnishing"] = "Choose a furnishing preference.";
    if (!TENANCIES.has(value.requirements.tenancy)) errors["requirements.tenancy"] = "Choose a tenancy type.";
    required("requirements.tenancyPeriod", value.requirements.tenancyPeriod);
    if (!DEPOSITS.has(value.requirements.depositAgreement)) errors["requirements.depositAgreement"] = "Choose an answer.";
  }
  if (value.intent === "buy") {
    required("requirements.purchaseTimeline", value.requirements.purchaseTimeline);
    if (!PURPOSES.has(value.requirements.purpose)) errors["requirements.purpose"] = "Choose a purpose.";
    if (!LOANS.has(value.requirements.loan)) errors["requirements.loan"] = "Choose a loan option.";
  }
  if (!value.consent) errors.consent = "Consent is required before submission.";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(value.idempotencyKey)) errors.idempotencyKey = "Invalid submission key.";
  return { value, errors, valid: Object.keys(errors).length === 0 };
}

export function formatRoomSummary(bedrooms, bathrooms) {
  const roomValue = bedrooms === "" || bedrooms === null || bedrooms === undefined ? null : Number(bedrooms);
  const bathValue = bathrooms === "" || bathrooms === null || bathrooms === undefined ? null : Number(bathrooms);
  const rooms = Number.isFinite(roomValue) ? `${roomValue}R` : "";
  const baths = Number.isFinite(bathValue) ? `${bathValue}B` : "";
  return [rooms, baths].filter(Boolean).join(" ");
}

export function formatRequirementReference(prefix, sequence) {
  if (!new Set(["WTR", "WTB"]).has(prefix) || !Number.isInteger(Number(sequence)) || Number(sequence) < 1 || Number(sequence) > 999_999) return "";
  return `${prefix}${String(Number(sequence)).padStart(6, "0")}`;
}
