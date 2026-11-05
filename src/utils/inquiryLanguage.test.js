import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { COUNTRY_OPTIONS, INQUIRY_PROPERTY_TYPE_OPTIONS, FURNISHING_OPTIONS, RACE_OPTIONS, DEPOSIT_OPTIONS, TENANCY_OPTIONS, PROPERTY_USAGE_OPTIONS, PURPOSE_OPTIONS, LOAN_OPTIONS, emptyRequirement, validateRequirementPayload } from "../data/requirementContract.js";
import { INQUIRY_LANGUAGES, INQUIRY_TRANSLATIONS, normalizeInquiryLanguage, translateInquiry, translateInquiryValue } from "./inquiryLanguage.js";

test("English is the default and all supported languages have complete dictionary entries", () => {
  for (const value of [null, undefined, "", "fr", "<script>"]) assert.equal(normalizeInquiryLanguage(value), "en");
  assert.deepEqual(INQUIRY_LANGUAGES.map(item => item.value), ["en", "ms", "zh"]);
  for (const [key, translations] of Object.entries(INQUIRY_TRANSLATIONS)) {
    assert.equal(translations.length, 2, key);
    assert.ok(translations.every(value => typeof value === "string" && value.trim()), key);
    assert.equal(translateInquiry("en", key), key);
    for (const translation of translations) assert.deepEqual(translation.match(/\{\w+\}/g)?.sort(), key.match(/\{\w+\}/g)?.sort(), key);
  }
});

test("every canonical option has Malay and Chinese display labels without changing values", () => {
  const options = [...COUNTRY_OPTIONS.map(([name]) => name), ...INQUIRY_PROPERTY_TYPE_OPTIONS, ...FURNISHING_OPTIONS, ...RACE_OPTIONS, ...DEPOSIT_OPTIONS, ...TENANCY_OPTIONS, ...PROPERTY_USAGE_OPTIONS, ...PURPOSE_OPTIONS, ...LOAN_OPTIONS];
  const before = JSON.stringify(options);
  for (const option of options) {
    assert.ok(INQUIRY_TRANSLATIONS[option], option);
    assert.ok(translateInquiry("ms", option));
    assert.ok(translateInquiry("zh", option));
  }
  assert.equal(JSON.stringify(options), before);
  assert.equal(translateInquiryValue("zh", "propertyType", "Room"), "房间");
  for (const key of ["name", "occupation", "companyName", "otherNeeds", "area", "raceOther", "countryOther"]) assert.equal(translateInquiryValue("zh", key, "Chinese"), "Chinese", key);
});

test("dynamic labels and names interpolate safely", () => {
  assert.equal(translateInquiry("zh", "Step {step} of {total}", { step: 3, total: 6 }), "第 3 步，共 6 步");
  assert.equal(translateInquiry("ms", "Increase {label}", { label: "Bilik Tidur" }), "Tambah Bilik Tidur");
  assert.equal(translateInquiry("zh", "We've got you, {name}.", { name: "<b>Tan</b>" }), "<b>Tan</b>，我们已收到您的需求。");
});

test("known submission API errors are translated", () => {
  const source = fs.readFileSync(new URL("../../functions/api/requirements.js", import.meta.url), "utf8");
  for (const match of source.matchAll(/error: "([^"]+)"/g)) assert.ok(INQUIRY_TRANSLATIONS[match[1]], match[1]);
});

test("workflow's static display text and translatable attributes are covered", () => {
  const source = fs.readFileSync(new URL("../pages/RequirementPage.jsx", import.meta.url), "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const checked = new Set();
  const check = value => {
    if (!/[a-z]/i.test(value) || value === "dd/mm/yyyy") return;
    checked.add(value);
    assert.ok(INQUIRY_TRANSLATIONS[value], `Missing display translation: ${value}`);
  };
  const traverse = traverseModule.default;
  traverse(ast, {
    JSXText(path) { assert.ok(!/[a-z]/i.test(path.node.value), `Unlocalized JSX text: ${path.node.value}`); },
    JSXAttribute(path) {
      const node = path.node;
      if (path.parent.name?.name === "Seo") return;
      if (["label", "title", "description", "eyebrow"].includes(node.name.name) && node.value?.type === "StringLiteral") check(node.value.value);
      if (node.name.name === "text" && node.value?.expression?.type === "StringLiteral") check(node.value.expression.value);
    },
    CallExpression(path) {
      if (path.node.callee.name === "t" && path.node.arguments[0]?.type === "StringLiteral") check(path.node.arguments[0].value);
    },
    ReferencedIdentifier(path) {
      if (["language", "t"].includes(path.node.name)) assert.ok(path.scope.hasBinding(path.node.name), `Unbound locale reference: ${path.node.name}`);
    },
  });
  assert.ok(checked.size > 50);
  assert.match(source, /<InquiryLanguageProvider><RequirementWorkflow \/><\/InquiryLanguageProvider>/);
  assert.equal((source.match(/<InquiryLanguagePicker \/>/g) || []).length, 2);
  assert.match(source, /<option value=\{name\} key=\{name\}>\{t\(name\)\}/);
  assert.doesNotMatch(source, /value=\{t\(/);
});

test("translations leave Room validation and canonical submission data unchanged", () => {
  const form = emptyRequirement("rent");
  form.requirements.propertyType = "Room";
  const before = JSON.stringify(form);
  for (const language of ["en", "ms", "zh"]) for (const [key, value] of Object.entries(form.requirements)) translateInquiryValue(language, key, value);
  assert.equal(JSON.stringify(form), before);
  assert.equal(validateRequirementPayload(form).value.requirements.storeys, null);
});
