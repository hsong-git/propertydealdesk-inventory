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
      occupation: "Engineer",
    },
    requirements: {
      propertyType: "Terrace House",
      area: "Bayuemas",
      budget: 1500,
      bedrooms: 3,
      bathrooms: 2,
      moveInDate: "September 2026",
      furnishing: "Fully furnished",
      otherNeeds: "Near school",
    },
  });

  assert.match(text, /\*WTR000003\*/);
  assert.match(text, /\*Rent Requirement\*/);
  assert.match(text, /Name: Nuryana Hartini Abd Latif/);
  assert.match(text, /- Area: Bayuemas/);
  assert.match(text, /- Budget: RM 1,500 \/ month/);
  assert.match(text, /- Rooms: 3R 2B/);
  assert.match(text, /- Other Needs: Near school/);
  assert.doesNotMatch(text, /Mobile Number|mobile|\+60193465091|60193465091/);
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
