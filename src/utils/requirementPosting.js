import { formatRoomSummary } from "../data/requirementContract.js";
import { formatDateTime, formatPrice } from "./listing.js";

const labels = {
  propertyType: "Property Type",
  storeys: "Storeys",
  area: "Area",
  budget: "Budget",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  moveInDate: "Move-in Date",
  peopleStaying: "People Staying",
  relationship: "Relationship",
  pet: "Pet",
  furnishing: "Furnishing",
  tenancy: "Tenancy",
  tenancyPeriod: "Tenancy Period",
  depositAgreement: "Deposit / Fees",
  purchaseTimeline: "Purchase Timeline",
  purpose: "Purpose",
  loan: "Loan",
  occupants: "Occupants",
  otherNeeds: "Other Needs",
};

const profileLabels = {
  race: "Race",
  country: "Country",
  occupation: "Occupation",
  companyName: "Company Name",
};

const clean = (value) => String(value ?? "").trim();
const hasValue = (value) => value !== undefined && value !== null && clean(value) !== "";

const intentLabel = (intent) => clean(intent).toLowerCase() === "rent" ? "Rent" : "Buy";
const priceIntent = (intent) => clean(intent).toLowerCase() === "rent" ? "WTL" : "WTS";

function valueForRequirement(key, value, submission) {
  if (key === "budget") return formatPrice(value, priceIntent(submission.intent));
  if (key === "bedrooms" || key === "bathrooms") return null;
  return clean(value);
}

export function inquiryPostingText(submission) {
  const requirements = submission?.requirements || {};
  const profile = submission?.profile || {};
  const race = clean(profile.race).toLowerCase() === "other" && hasValue(profile.raceOther)
    ? profile.raceOther
    : profile.race;
  const lines = [
    `*${clean(submission?.reference) || "Property Inquiry"}*`,
    `*${intentLabel(submission?.intent)} Requirement*`,
  ];

  if (hasValue(submission?.submittedAt)) lines.push(`Submitted: ${formatDateTime(submission.submittedAt)}`);
  if (hasValue(submission?.name || profile.name)) lines.push(`Name: ${clean(submission.name || profile.name)}`);

  const applicantDetails = {
    race,
    country: profile.country,
    occupation: profile.occupation,
    companyName: profile.companyName,
  };
  const applicantLines = Object.entries(applicantDetails)
    .filter(([, value]) => hasValue(value))
    .map(([key, value]) => `- ${profileLabels[key] || key}: ${clean(value)}`);
  if (applicantLines.length) {
    lines.push("", "*Applicant Details*", ...applicantLines);
  }
  lines.push("");

  const roomSummary = formatRoomSummary(requirements.bedrooms, requirements.bathrooms);
  const details = {
    propertyType: requirements.propertyType,
    storeys: requirements.storeys,
    area: requirements.area || submission?.area,
    budget: requirements.budget || submission?.budget,
    bedroomsBathrooms: roomSummary === "Rooms TBC" ? "" : roomSummary,
    moveInDate: requirements.moveInDate,
    peopleStaying: requirements.peopleStaying,
    relationship: requirements.relationship,
    pet: requirements.pet,
    furnishing: requirements.furnishing,
    tenancy: requirements.tenancy,
    tenancyPeriod: requirements.tenancyPeriod,
    depositAgreement: requirements.depositAgreement,
    purchaseTimeline: requirements.purchaseTimeline,
    purpose: requirements.purpose,
    loan: requirements.loan,
    occupants: requirements.occupants,
    otherNeeds: requirements.otherNeeds || submission?.otherNeeds,
  };

  lines.push("*Requirement Details*");
  for (const [key, value] of Object.entries(details)) {
    if (!hasValue(value)) continue;
    if (key === "bedroomsBathrooms") {
      lines.push(`- Rooms: ${value}`);
      continue;
    }
    const formatted = valueForRequirement(key, value, submission);
    if (formatted) lines.push(`- ${labels[key] || key}: ${formatted}`);
  }

  lines.push("", "Contact HS Ong for matching property opportunities.");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
