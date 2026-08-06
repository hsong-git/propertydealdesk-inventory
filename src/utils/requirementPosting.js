import { formatRequirementDate, formatRoomSummary } from "../data/requirementContract.js";
import { formatPrice } from "./listing.js";

const clean = (value) => String(value ?? "").trim();
const hasValue = (value) => value !== undefined && value !== null && clean(value) !== "";

const priceIntent = (intent) => clean(intent).toLowerCase() === "rent" ? "WTL" : "WTS";
const lookingTo = (submission) => clean(submission?.reference).slice(0, 3).toUpperCase()
  || (clean(submission?.intent).toLowerCase() === "rent" ? "WTR" : "WTB");
const detailLine = (label, value) => hasValue(value) ? `*${label}:* ${clean(value)}` : null;
const normalizedRace = (profile) => ["other", "others"].includes(clean(profile.race).toLowerCase()) && hasValue(profile.raceOther)
  ? profile.raceOther
  : profile.race;
const normalizedCountry = (profile) => clean(profile.country).toLowerCase() === "other" && hasValue(profile.countryOther)
  ? profile.countryOther
  : profile.country;

export function inquiryPostingText(submission) {
  const requirements = submission?.requirements || {};
  const profile = submission?.profile || {};
  const roomSummary = formatRoomSummary(requirements.bedrooms, requirements.bathrooms);
  const otherNeeds = requirements.otherNeeds || submission?.otherNeeds;
  const lines = [
    detailLine("Reference", clean(submission?.reference) || "Property Inquiry"),
    detailLine("Looking to", lookingTo(submission)),
    detailLine("Name", submission?.name || profile.name),
    "",
    detailLine("Race", normalizedRace(profile)),
    detailLine("Country", normalizedCountry(profile)),
    detailLine("Occupation", profile.occupation),
    detailLine("Company Name", profile.companyName),
    "",
    detailLine("Property type", requirements.propertyType),
    detailLine("Storeys", requirements.storeys),
    detailLine("Area / Location", requirements.area || submission?.area),
    detailLine("Budget", hasValue(requirements.budget || submission?.budget) ? formatPrice(requirements.budget || submission?.budget, priceIntent(submission?.intent)) : ""),
    detailLine("Rooms", roomSummary),
    detailLine("Usage", requirements.propertyUsage),
    requirements.propertyUsage === "Commercial" ? detailLine("Commercial Activity", requirements.commercialActivity) : null,
  ];

  if (clean(submission?.intent).toLowerCase() === "rent") {
    lines.push(
      detailLine("Move-in Date", hasValue(requirements.moveInDate) ? formatRequirementDate(requirements.moveInDate) : ""),
      detailLine("People Staying", requirements.peopleStaying),
      detailLine("Relationship", requirements.relationship),
      detailLine("Pet", requirements.pet),
      detailLine("Furnishing", requirements.furnishing),
      detailLine("Tenancy", requirements.tenancy),
      detailLine("Tenancy Period", requirements.tenancyPeriod),
      detailLine("Deposits and Fees", requirements.depositAgreement),
    );
  } else {
    lines.push(
      detailLine("Purchase Timeline", requirements.purchaseTimeline),
      detailLine("Number of Occupants", requirements.occupants),
      detailLine("Purpose", requirements.purpose),
      detailLine("Loan", requirements.loan),
    );
  }

  if (hasValue(otherNeeds)) lines.push("", "*Other Needs:*", clean(otherNeeds));
  return lines.filter((line) => line !== null).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
