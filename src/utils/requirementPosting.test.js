import assert from "node:assert/strict";
import test from "node:test";
import { inquiryPostingText } from "./requirementPosting.js";

test("formats inquiry posting content without mobile number", () => {
  const text = inquiryPostingText({
    reference: "WTR000001",
    intent: "rent",
    name: "Ong",
    mobile: "+60193465091",
    area: "Setia Alam, Bayu",
    budget: 2000,
    profile: {
      name: "Ong",
      mobile: "+60193465091",
      race: "Chinese",
      country: "Malaysia",
      occupation: "FDFD",
      companyName: "FDSF",
    },
    requirements: {
      propertyType: "Terrace House",
      storeys: 1,
      area: "Setia Alam, Bayu",
      budget: 2000,
      bedrooms: 1,
      bathrooms: 1,
      propertyUsage: "Commercial",
      commercialActivity: "Old Folks home",
      moveInDate: "2026-08-12",
      peopleStaying: 1,
      relationship: "Family",
      pet: "No",
      furnishing: "Basic",
      tenancy: "Individual",
      tenancyPeriod: "3+ years",
      depositAgreement: "Yes",
      otherNeeds: "Need to have ladder\nbig extra side land",
    },
  });

  assert.equal(text, `*Reference:* WTR000001
*Looking to:* WTR
*Name:* Ong

*Race:* Chinese
*Country:* Malaysia
*Occupation:* FDFD
*Company Name:* FDSF

*Property type:* Terrace House
*Storeys:* 1
*Area / Location:* Setia Alam, Bayu
*Budget:* RM 2,000 / month
*Rooms:* 1R 1B
*Usage:* Commercial
*Commercial Activity:* Old Folks home
*Move-in Date:* 12/08/2026
*People Staying:* 1
*Relationship:* Family
*Pet:* No
*Furnishing:* Basic
*Tenancy:* Individual
*Tenancy Period:* 3+ years
*Deposits and Fees:* Yes

*Other Needs:*
Need to have ladder
big extra side land`);
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

  assert.match(text, /\*Name:\* Test Applicant/);
  assert.match(text, /\*Race:\* Foreigner/);
  assert.match(text, /\*Country:\* Singapore/);
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

  assert.match(text, /\*Looking to:\* WTB/);
  assert.match(text, /\*Name:\* Yong/);
  assert.match(text, /\*Area \/ Location:\* Bukit Tinggi/);
  assert.match(text, /\*Budget:\* RM 500,000/);
  assert.doesNotMatch(text, /\+60165573873|60165573873|Mobile Number/);
});
