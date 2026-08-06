import assert from "node:assert/strict";
import test from "node:test";
import { inquiryPostingText } from "./requirementPosting.js";

test("formats inquiry posting content without mobile number", () => {
  const text = inquiryPostingText({
    reference: "WTR000003",
    submittedAt: "2026-08-05T10:34:00Z",
    intent: "rent",
    name: "Nuryana Hartini Abd Latif",
    mobile: "+60193465091",
    area: "Bayuemas",
    budget: 1500,
    profile: {
      name: "Nuryana Hartini Abd Latif",
      mobile: "+60193465091",
      race: "Malay",
      country: "Malaysia",
      occupation: "Account Supervisor",
      companyName: "Westports Malaysia Sdn Bhd",
    },
    requirements: {
      propertyType: "Terrace House",
      area: "Bayuemas",
      budget: 1500,
      bedrooms: 3,
      bathrooms: 2,
      propertyUsage: "Commercial",
      commercialActivity: "Retail office",
      moveInDate: "September 2026",
      furnishing: "Fully furnished",
      otherNeeds: "Near school",
    },
  });

  assert.match(text, /\*WTR000003\*/);
  assert.match(text, /\*Rent Requirement\*/);
  assert.match(text, /Name: Nuryana Hartini Abd Latif/);
  assert.match(text, /\*Applicant Details\*/);
  assert.match(text, /- Race: Malay/);
  assert.match(text, /- Country: Malaysia/);
  assert.match(text, /- Occupation: Account Supervisor/);
  assert.match(text, /- Company Name: Westports Malaysia Sdn Bhd/);
  assert.match(text, /- Area: Bayuemas/);
  assert.match(text, /- Budget: RM 1,500 \/ month/);
  assert.match(text, /- Rooms: 3R 2B/);
  assert.match(text, /- Property Usage: Commercial/);
  assert.match(text, /- Commercial Activity: Retail office/);
  assert.match(text, /- Other Needs: Near school/);
  assert.doesNotMatch(text, /Mobile Number|mobile|\+60193465091|60193465091/);
});

test("uses the specified other race detail without copying mobile contact", () => {
  const text = inquiryPostingText({
    reference: "WTR000004",
    intent: "rent",
    profile: {
      name: "Test Applicant",
      mobile: "+60123456789",
      race: "Other",
      raceOther: "Foreigner",
      country: "Singapore",
    },
    requirements: {
      area: "Klang",
      budget: 2000,
    },
  });

  assert.match(text, /Name: Test Applicant/);
  assert.match(text, /- Race: Foreigner/);
  assert.match(text, /- Country: Singapore/);
  assert.doesNotMatch(text, /Other:|Mobile Number|\+60123456789|60123456789/);
});

test("falls back to row summary fields when detail fields are absent", () => {
  const text = inquiryPostingText({
    reference: "WTB000002",
    intent: "buy",
    name: "Yong",
    mobile: "+60165573873",
    area: "Bukit Tinggi",
    budget: 500000,
  });

  assert.match(text, /\*Buy Requirement\*/);
  assert.match(text, /Name: Yong/);
  assert.match(text, /- Area: Bukit Tinggi/);
  assert.match(text, /- Budget: RM 500,000/);
  assert.doesNotMatch(text, /\+60165573873|60165573873|Mobile Number/);
});
