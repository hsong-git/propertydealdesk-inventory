import { ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, Copy, Home, LoaderCircle, MessageCircle, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PropertyCard } from "../components/PropertyCard";
import { Seo } from "../components/Seo";
import { agentProfile } from "../config/agentProfile";
import {
  COUNTRY_OPTIONS, DEPOSIT_OPTIONS, emptyRequirement, formatRequirementDate, formatRoomSummary, FURNISHING_OPTIONS, isValidBudgetAmount, LOAN_OPTIONS, normalizeBudgetAmount, parseRequirementDate,
  PROPERTY_USAGE_OPTIONS, requirementHasOtherRelationship, formatRequirementRelationship,
  PURPOSE_OPTIONS, RACE_OPTIONS, TENANCY_OPTIONS, validateRequirementPayload,
  isValidMobileNumber, normalizeMobileNumber, INQUIRY_PROPERTY_TYPE_OPTIONS, requirementStoreysLabel, requirementHasStoreys,
} from "../data/requirementContract";
import { useInventory } from "../hooks";
import { buildLocationOptions } from "../utils/locationFilter";
import { formatPrice } from "../utils/listing";
import { SITE_ORIGIN } from "../utils/seo";
import { matchRequirements } from "../utils/requirementMatching";
import { buildWhatsAppUrl, isMobileOrTabletDevice } from "../utils/whatsapp";
import { trackEvent } from "../utils/analytics";
import { InquiryLanguageProvider, InquiryLanguagePicker, InquiryText, useInquiryLanguage } from "../components/InquiryLanguage";
import { INQUIRY_LANGUAGES, translateInquiryValue } from "../utils/inquiryLanguage";

const makeSubmissionKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const RENT_BUDGETS = [1000, 1500, 2000, 2500, 3000, 3500, 4000];
const BUY_BUDGETS = [300000, 500000, 800000];
const RELATIONSHIPS = ["Single", "Couple", "Family", "Friends", "Other"];
const RENTAL_PERIODS = ["1 year", "2 years", "3+ years"];
const PURCHASE_TIMELINES = ["Within 3 months", "3–6 months", "6–12 months", "Just exploring"];

function requirementWhatsAppMessage(submission, reference) {
  const profile = submission.profile;
  const requirements = submission.requirements;
  const occupants = requirements.occupants || requirements.peopleStaying || "Not specified";
  const highlightedLines = [
    `*Budget:* *${formatPrice(requirements.budget, submission.intent === "rent" ? "WTL" : "WTS")}*`,
    ...(submission.intent === "rent" ? [
      `*Move-in Date:* *${formatRequirementDate(requirements.moveInDate)}*`,
      `*Furnishing:* *${requirements.furnishing}*`,
      `*Tenancy Period:* *${requirements.tenancyPeriod}*`,
    ] : []),
  ];
  const detailLines = [
    `*Property type:* ${requirements.propertyType}`,
    ...(requirementHasStoreys(requirements.propertyType) ? [`*${requirementStoreysLabel(requirements.propertyType, true)}:* ${requirements.storeys}`] : []),
    `*Area / Location:* ${requirements.area}`,
    `*Rooms:* ${formatRoomSummary(requirements.bedrooms, requirements.bathrooms)}`,
    ...(submission.intent === "rent" ? [
      `*Usage:* ${requirements.propertyUsage}`,
      ...(requirements.propertyUsage === "Commercial" ? [`*Commercial Activity:* ${requirements.commercialActivity}`] : []),
      `*People Staying:* ${requirements.peopleStaying}`,
      `*Relationship:* ${formatRequirementRelationship(requirements)}`,
      `*Pet:* ${requirements.pet}`,
      `*Tenancy:* ${requirements.tenancy}`,
      `*Deposits and Fees:* ${requirements.depositAgreement}`,
    ] : [
      `*Purchase Timeline:* ${requirements.purchaseTimeline}`,
      `*Number of Occupants:* ${occupants}`,
      `*Purpose:* ${requirements.purpose}`,
      `*Loan:* ${requirements.loan}`,
    ]),
  ];
  const lines = [
    `Hi ${agentProfile.displayName}, I have submitted a property requirement.`,
    "",
    `*Reference:* ${reference}`,
    `*Looking to:* ${submission.intent === "rent" ? "WTR" : "WTB"}`,
    `*Name:* ${profile.name}`,
    `*Race:* ${profile.race}${profile.race === "Others" && profile.raceOther ? ` (${profile.raceOther})` : ""}`,
    `*Country:* ${profile.country}${profile.country === "Other" && profile.countryOther ? ` (${profile.countryOther})` : ""}`,
    `*Occupation:* ${profile.occupation}`,
    `*Company Name:* ${profile.companyName}`,
    "",
    ...highlightedLines,
    "",
    ...detailLines,
    ...(requirements.otherNeeds ? ["", `*Other Needs:*\n${requirements.otherNeeds}`] : []),
  ];
  return lines.join("\n");
}

function Field({ label, error, optional = false, children }) {
  const { t } = useInquiryLanguage();
  return <label className={`requirement-field ${error ? "has-error" : ""}`}><span>{t(label)}{optional ? <small><InquiryText text={"Optional"} /></small> : null}</span>{children}{error ? <em role="alert">{t(error)}</em> : null}</label>;
}

function ChoiceGroup({ label, value, options, onChange, error }) {
  const { t } = useInquiryLanguage();
  return (
    <fieldset className={`requirement-choice-field ${error ? "has-error" : ""}`}>
      <legend>{t(label)}</legend>
      <div className="requirement-choices">{options.map((option) => <button className={value === option ? "active" : ""} type="button" key={option} onClick={() => onChange(option)}>{t(option)}</button>)}</div>
      {error ? <em>{t(error)}</em> : null}
    </fieldset>
  );
}

function ChoiceTiles({ label, value, options, onChange, error, columns = 2, id }) {
  const { t } = useInquiryLanguage();
  return <fieldset id={id} tabIndex={id ? -1 : undefined} className={`requirement-choice-field tile-choice-field ${error ? "has-error" : ""}`} style={{ "--choice-columns": columns }}><legend>{t(label)}</legend><div className="requirement-tiles">{options.map((option) => <button className={value === option ? "active" : ""} type="button" key={option} onClick={() => onChange(option)}>{t(option)}</button>)}</div>{error ? <em role="alert">{t(error)}</em> : null}</fieldset>;
}

function StepperField({ label, value, onChange, error, min = 0 }) {
  const { t } = useInquiryLanguage();
  const numeric = value === "" ? "" : Number(value);
  return <fieldset className={`requirement-stepper-field ${error ? "has-error" : ""}`}><legend>{t(label)}</legend><div className="requirement-stepper"><button type="button" aria-label={t("Decrease {label}", { label: t(label) })} onClick={() => onChange(numeric === "" ? min : Math.max(min, numeric - 1))}>−</button><strong>{numeric === "" ? "—" : numeric}</strong><button type="button" aria-label={t("Increase {label}", { label: t(label) })} onClick={() => onChange(numeric === "" ? Math.max(1, min) : numeric + 1)}>+</button></div>{error ? <em>{t(error)}</em> : null}</fieldset>;
}

function BudgetPicker({ intent, value, onChange, error }) {
  const { t } = useInquiryLanguage();
  const initialCustom = value !== "" && ![...(intent === "rent" ? RENT_BUDGETS : BUY_BUDGETS)].includes(Number(value));
  const [customActive, setCustomActive] = useState(initialCustom);
  const options = intent === "rent" ? RENT_BUDGETS : BUY_BUDGETS;
  const customInvalid = customActive && !isValidBudgetAmount(value);
  const label = (amount) => intent === "rent" ? `RM ${amount.toLocaleString("en-MY")}` : `RM ${(amount / 1000).toLocaleString("en-MY")}k`;
  return <fieldset className={`requirement-choice-field budget-picker ${error || customInvalid ? "has-error" : ""}`}><legend><InquiryText text={"Budget"} /></legend><div className="requirement-tiles budget-tiles">{options.map((option) => <button className={!customActive && Number(value) === option ? "active" : ""} type="button" key={option} onClick={() => { setCustomActive(false); onChange(option); }}>{label(option)}</button>)}<button className={customActive ? "active" : ""} type="button" onClick={() => { setCustomActive(true); if (!customActive) onChange(""); }}><InquiryText text={"Custom"} /></button></div>{customActive ? <input className="budget-custom-input" required type="number" min="1" max="1000000000" step="1" inputMode="numeric" aria-label={t("Custom budget")} placeholder={t("Enter one amount in RM")} value={value} onChange={(event) => onChange(normalizeBudgetAmount(intent, event.target.value) ?? event.target.value)} autoFocus /> : null}{error || customInvalid ? <em>{t(error || "Enter one positive budget amount.")}</em> : null}</fieldset>;
}

function DatePickerField({ value, onChange }) {
  const { language, t } = useInquiryLanguage();
  const [open, setOpen] = useState(false);
  const selected = parseRequirementDate(value) || "";
  const selectedParts = selected ? selected.split("-").map(Number) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = selectedParts ? new Date(Date.UTC(selectedParts[0], selectedParts[1] - 1, 1)) : new Date();
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocumentPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => {
    const firstDay = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
    const mondayOffset = (firstDay + 6) % 7;
    const count = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
    return [...Array(mondayOffset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [visibleMonth]);

  const shiftMonth = (amount) => {
    const date = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + amount, 1));
    setVisibleMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };

  return <div ref={containerRef} className="requirement-date-picker">
    <div className="requirement-date-control">
      <input id="requirement-move-in-date" required type="text" inputMode="numeric" placeholder="dd/mm/yyyy" value={formatRequirementDate(value)} onChange={(event) => onChange(event.target.value)} onBlur={() => { const parsed = parseRequirementDate(value); if (parsed) onChange(formatRequirementDate(parsed)); }} />
      <button type="button" className="date-picker-button" aria-label={t("Open calendar for move-in date")} aria-expanded={open} onClick={() => setOpen((current) => !current)}><Calendar size={18} /></button>
    </div>
    {open ? <div className="requirement-calendar-popover" role="dialog" aria-label={t("Choose move-in date")}>
      <div className="requirement-calendar-header"><button type="button" aria-label={t("Previous month")} onClick={() => shiftMonth(-1)}>‹</button><strong>{new Intl.DateTimeFormat(INQUIRY_LANGUAGES.find(item => item.value === language).locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)))}</strong><button type="button" aria-label={t("Next month")} onClick={() => shiftMonth(1)}>›</button></div>
      <div className="requirement-calendar-weekdays" aria-hidden="true">{(language === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : language === "ms" ? ["Is", "Se", "Ra", "Kh", "Ju", "Sa", "Ah"] : ["M", "T", "W", "T", "F", "S", "S"]).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="requirement-calendar-grid">{days.map((day, index) => {
        if (!day) return <span className="requirement-calendar-empty" key={`empty-${index}`} />;
        const iso = `${String(visibleMonth.year).padStart(4, "0")}-${String(visibleMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return <button type="button" key={iso} className={selected === iso ? "active" : ""} aria-label={formatRequirementDate(iso)} aria-pressed={selected === iso} onClick={() => { onChange(formatRequirementDate(iso)); setOpen(false); }}>{day}</button>;
      })}</div>
    </div> : null}
  </div>;
}

function StepIntro({ eyebrow, title, description }) {
  const { t } = useInquiryLanguage();
  return <div className="form-heading"><span className="eyebrow">{t(eyebrow)}</span><h2>{t(title)}</h2>{description ? <p>{t(description)}</p> : null}</div>;
}

function WizardActions({ onBack, label, onSubmit }) {
  const { t } = useInquiryLanguage();
  return <div className="wizard-actions"><button className="button secondary" type="button" onClick={onBack}><ArrowLeft size={17} />{" "}<InquiryText text={"Back"} /></button><button className="button primary" type="submit" onClick={onSubmit}>{t(label)} <ArrowRight size={17} /></button></div>;
}

function PropertyBasicsStep({ form, propertyTypes, locations, errors, updateRequirement, onBack, onSubmit }) {
  const { t } = useInquiryLanguage();
  const [customType, setCustomType] = useState(false);
  const typeOptions = INQUIRY_PROPERTY_TYPE_OPTIONS;
  const quickLocations = [
    "Bandar Botanic", "Bandar Bukit Raja", "Bandar Parklands", "Bandar Puteri Klang",
    "Taman Sentosa", "Setia Alam",
    "Bukit Tinggi",
  ];
  const selectType = (option) => { setCustomType(false); updateRequirement("propertyType", option); };
  return <form onSubmit={onSubmit} className="requirement-step-panel"><StepIntro eyebrow="Property Basics" title="Start with the big picture" description="Where should we look, and what kind of place feels right?" /><div className="requirement-grid">
    <fieldset className={`requirement-choice-field tile-choice-field property-type-picker ${errors["requirements.propertyType"] ? "has-error" : ""}`} style={{ "--choice-columns": 2 }}><legend><InquiryText text={"Property Type"} /></legend><div className="requirement-tiles">{typeOptions.slice(0, 7).map((option) => <button className={form.requirements.propertyType === option ? "active" : ""} type="button" key={option} onClick={() => selectType(option)}>{t(option)}</button>)}<button className={customType ? "active" : ""} type="button" onClick={() => { setCustomType(true); updateRequirement("propertyType", ""); }}><InquiryText text={"Other"} /></button></div>{customType ? <input className="choice-custom-input" required aria-label={t("Other property type")} placeholder={t("Type a property type")} value={form.requirements.propertyType} onChange={(e) => updateRequirement("propertyType", e.target.value)} /> : null}{errors["requirements.propertyType"] ? <em>{t(errors["requirements.propertyType"])}</em> : null}</fieldset>
    {requirementHasStoreys(form.requirements.propertyType) ? <StepperField label={requirementStoreysLabel(form.requirements.propertyType)} min={1} value={form.requirements.storeys} onChange={(value) => updateRequirement("storeys", value)} error={errors["requirements.storeys"]} /> : null}
    <fieldset className="requirement-choice-field location-picker"><legend><InquiryText text={"Area / Location"} /></legend><div className="location-chips">{quickLocations.map((option) => <button className={form.requirements.area === option ? "active" : ""} type="button" key={option} onClick={() => updateRequirement("area", option)}>{t(option)}</button>)}</div><input required list="requirement-locations" aria-label={t("Area / Location")} placeholder={t("Or search an area")} value={form.requirements.area} onChange={(e) => updateRequirement("area", e.target.value)} /><datalist id="requirement-locations">{locations.map((item) => <option key={item} value={item} />)}</datalist>{errors["requirements.area"] ? <em>{t(errors["requirements.area"])}</em> : null}</fieldset>
    <BudgetPicker intent={form.intent} value={form.requirements.budget} onChange={(value) => updateRequirement("budget", value)} error={errors["requirements.budget"]} />
  </div><WizardActions onBack={onBack} label="Next: Home Fit" /></form>;
}

function HomeFitStep({ form, errors, updateRequirement, onBack, onSubmit }) {
  const { t } = useInquiryLanguage();
  const moveInDateField = <Field label="Move-in Date" error={errors["requirements.moveInDate"]}><DatePickerField value={form.requirements.moveInDate} onChange={(value) => updateRequirement("moveInDate", value)} /></Field>;
  return <form onSubmit={onSubmit} className="requirement-step-panel"><StepIntro eyebrow="Home Fit" title="Now let&apos;s shape the fit" description="A couple of quick taps helps us narrow the search." /><div className="requirement-grid"><div className="room-picker"><StepperField label="Bedrooms" value={form.requirements.bedrooms} onChange={(value) => updateRequirement("bedrooms", value)} error={errors["requirements.bedrooms"]} /><StepperField label="Bathrooms" value={form.requirements.bathrooms} onChange={(value) => updateRequirement("bathrooms", value)} error={errors["requirements.bathrooms"]} /><p className="room-order-note"><InquiryText text={"Your home search:"} />{" "}<strong>{formatRoomSummary(form.requirements.bedrooms, form.requirements.bathrooms) || t("Choose rooms")}</strong></p></div>{form.intent === "rent" ? <><StepperField label="Number of People Staying" min={1} value={form.requirements.peopleStaying} onChange={(value) => updateRequirement("peopleStaying", value)} error={errors["requirements.peopleStaying"]} /><div className="relationship-picker"><ChoiceTiles label="Relationship" value={form.requirements.relationship} options={RELATIONSHIPS} onChange={(value) => updateRequirement("relationship", value)} error={errors["requirements.relationship"]} columns={3} />{requirementHasOtherRelationship(form.requirements.relationship) ? <Field label="Relationship details" error={errors["requirements.relationshipOther"]}><input required maxLength={160} aria-label={t("Relationship details")} placeholder={t("Please describe the relationship")} value={form.requirements.relationshipOther || ""} onChange={(e) => updateRequirement("relationshipOther", e.target.value)} /></Field> : null}</div>{moveInDateField}</> : <ChoiceTiles label="Purchase Timeline" value={form.requirements.purchaseTimeline} options={PURCHASE_TIMELINES} onChange={(value) => updateRequirement("purchaseTimeline", value)} error={errors["requirements.purchaseTimeline"]} columns={2} />}</div><WizardActions onBack={onBack} label="Next: Preferences" /></form>;
}

function PreferencesStep({ form, errors, updateRequirement, onBack, onSubmit }) {
  const { t } = useInquiryLanguage();
  const updatePropertyUsage = (value) => {
    updateRequirement("propertyUsage", value);
    if (value !== "Commercial") updateRequirement("commercialActivity", "");
  };
  return <form onSubmit={onSubmit} className="requirement-step-panel"><StepIntro eyebrow="Preferences" title="Make it feel like yours" description="These small details help us understand the people and lifestyle behind the search." /><div className="requirement-grid">{form.intent === "rent" ? <><ChoiceTiles label="Property Usage" value={form.requirements.propertyUsage} options={PROPERTY_USAGE_OPTIONS} onChange={updatePropertyUsage} error={errors["requirements.propertyUsage"]} columns={2} />{form.requirements.propertyUsage === "Commercial" ? <Field label="Commercial Activity" error={errors["requirements.commercialActivity"]}><input required placeholder={t("e.g. office, retail, warehouse, F&B")} value={form.requirements.commercialActivity} onChange={(e) => updateRequirement("commercialActivity", e.target.value)} /></Field> : null}<ChoiceTiles label="Pet" value={form.requirements.pet} options={["No", "Yes"]} onChange={(value) => updateRequirement("pet", value)} error={errors["requirements.pet"]} columns={2} /><ChoiceTiles label="Furnishing" value={form.requirements.furnishing} options={FURNISHING_OPTIONS} onChange={(value) => updateRequirement("furnishing", value)} error={errors["requirements.furnishing"]} columns={2} /><ChoiceTiles label="Tenancy" value={form.requirements.tenancy} options={TENANCY_OPTIONS} onChange={(value) => updateRequirement("tenancy", value)} error={errors["requirements.tenancy"]} columns={2} /><ChoiceTiles label="Tenancy Period" value={form.requirements.tenancyPeriod} options={RENTAL_PERIODS} onChange={(value) => updateRequirement("tenancyPeriod", value)} error={errors["requirements.tenancyPeriod"]} columns={3} /></> : <><ChoiceTiles label="Purpose" value={form.requirements.purpose} options={PURPOSE_OPTIONS} onChange={(value) => updateRequirement("purpose", value)} error={errors["requirements.purpose"]} columns={3} /><ChoiceTiles label="Loan" value={form.requirements.loan} options={LOAN_OPTIONS} onChange={(value) => updateRequirement("loan", value)} error={errors["requirements.loan"]} columns={3} /></>}<Field label="Other Needs" optional><textarea rows="4" value={form.requirements.otherNeeds} onChange={(e) => updateRequirement("otherNeeds", e.target.value)} /></Field></div><WizardActions onBack={onBack} label={form.intent === "rent" ? "My Profile" : "My Profile"} /></form>;
}

const reviewLabels = {
  propertyType: "Property Type", storeys: "Number of Storeys", area: "Area / Location", budget: "Budget", rooms: "Bedrooms / Bathrooms",
  relationship: "Relationship", relationshipOther: "Relationship details", otherNeeds: "Other Needs", moveInDate: "Move-in Date", peopleStaying: "Number of People Staying",
  pet: "Pet", furnishing: "Furnishing", tenancy: "Tenancy", tenancyPeriod: "Tenancy Period", propertyUsage: "Property Usage", commercialActivity: "Commercial Activity", depositAgreement: "Deposits and Fees",
  purchaseTimeline: "Purchase Timeline", purpose: "Purpose", loan: "Loan", occupants: "Number of Occupants",
};

const displayValue = (key, value, intent) => {
  if (key === "budget") return intent === "rent" ? `RM ${Number(value).toLocaleString("en-MY")}` : formatPrice(Number(value), "WTS");
  return String(value);
};

const validationLabels = {
  "profile.name": "Name",
  "profile.mobile": "Mobile Number",
  "profile.race": "Race",
  "profile.raceOther": "Race (Other)",
  "profile.country": "Country",
  "profile.countryOther": "Country (Other)",
  "profile.occupation": "Occupation",
  "profile.companyName": "Company Name",
  "requirements.propertyType": "Property Type",
  "requirements.storeys": "Number of Storeys",
  "requirements.area": "Area / Location",
  "requirements.budget": "Budget",
  "requirements.bedrooms": "Bedrooms",
  "requirements.bathrooms": "Bathrooms",
  "requirements.moveInDate": "Move-in Date",
  "requirements.peopleStaying": "Number of People Staying",
  "requirements.relationship": "Relationship",
  "requirements.relationshipOther": "Relationship details",
  "requirements.propertyUsage": "Property Usage",
  "requirements.commercialActivity": "Commercial Activity",
  "requirements.pet": "Pet",
  "requirements.furnishing": "Furnishing",
  "requirements.tenancy": "Tenancy",
  "requirements.tenancyPeriod": "Tenancy Period",
  "requirements.depositAgreement": "Deposits and Fees",
  "requirements.purchaseTimeline": "Purchase Timeline",
  "requirements.purpose": "Purpose",
  "requirements.loan": "Loan",
  "requirements.occupants": "Number of Occupants",
  consent: "Consent",
};

const validationSummary = (errors, t) => Object.entries(errors).map(([key, message]) => `${t(validationLabels[key] || key)}: ${t(message)}`).join(" ");

function ReviewSection({ title, values, labels, onEdit, intent }) {
  const { language, t } = useInquiryLanguage();
  const entries = Object.entries(values).filter(([key, value]) => (key !== "storeys" || requirementHasStoreys(values.propertyType)) && value !== "" && value !== null && value !== undefined);
  if (entries.some(([key]) => key === "bedrooms" || key === "bathrooms")) {
    const combined = entries.filter(([key]) => key !== "bedrooms" && key !== "bathrooms");
    const budgetIndex = combined.findIndex(([key]) => key === "budget");
    combined.splice(budgetIndex < 0 ? combined.length : budgetIndex + 1, 0, ["rooms", formatRoomSummary(values.bedrooms, values.bathrooms)]);
    entries.splice(0, entries.length, ...combined);
  }
  return (
    <section className="review-section">
      <div className="review-heading"><h3>{t(title)}</h3><button type="button" onClick={onEdit}><Pencil size={15} />{" "}<InquiryText text={"Edit"} /></button></div>
      <dl>{entries.map(([key, value]) => (
        <div key={key}><dt>{t(key === "storeys" ? requirementStoreysLabel(values.propertyType) : labels[key] || key)}</dt><dd className={key === "otherNeeds" ? "review-multiline" : undefined}>{displayValue(key, translateInquiryValue(language, key, value), intent)}</dd></div>
      ))}</dl>
    </section>
  );
}

export function RequirementPage() {
  return <InquiryLanguageProvider><RequirementWorkflow /></InquiryLanguageProvider>;
}

function RequirementWorkflow() {
  const { language, t } = useInquiryLanguage();
  const inventory = useInventory();
  const [form, setForm] = useState(() => emptyRequirement());
  const [step, setStep] = useState(0);
  const [reviewEditStep, setReviewEditStep] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [messageCopied, setMessageCopied] = useState(false);
  const submissionKey = useRef(makeSubmissionKey());
  useEffect(() => {
    if (!form.consent) return;
    setErrors((current) => {
      if (!current.consent) return current;
      const next = { ...current };
      delete next.consent;
      return next;
    });
    setSubmitError((current) => current.includes("Consent") ? "" : current);
  }, [form.consent]);
  const steps = ["Choose", "Property Basics", "Home Fit", "Preferences", ...(form.intent === "rent" ? ["Deposits & Fees"] : []), "Your Profile", "Review"];
  const finalStep = steps.length - 1;
  const profileStep = finalStep - 1;
  const propertyTypes = useMemo(() => [...new Set(inventory.items.map((item) => item.propertyType).filter(Boolean))].sort(), [inventory.items]);
  const locations = useMemo(() => buildLocationOptions(inventory.items, inventory.locationDictionary).map((item) => typeof item === "string" ? item : item.value || item.label).filter(Boolean), [inventory.items, inventory.locationDictionary]);
  const updateProfile = (key, value) => setForm((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  const updateMobile = (value) => {
    updateProfile("mobile", value);
    setErrors((current) => {
      if (!current["profile.mobile"]) return current;
      const next = { ...current };
      delete next["profile.mobile"];
      return next;
    });
  };
  const updateCountry = (value) => setForm((current) => ({ ...current, profile: { ...current.profile, country: value, countryOther: value === "Other" ? current.profile.countryOther : "" } }));
  const updateRace = (value) => setForm((current) => ({ ...current, profile: { ...current.profile, race: value, raceOther: value === "Others" ? current.profile.raceOther : "" } }));
  const validateMobileField = () => {
    const mobile = form.profile.mobile;
    if (!mobile) return;
    if (!isValidMobileNumber(mobile)) {
      setErrors((current) => ({ ...current, "profile.mobile": "Enter a valid mobile number, including the country code where needed." }));
      return;
    }
    updateProfile("mobile", normalizeMobileNumber(mobile));
    setErrors((current) => {
      const next = { ...current };
      delete next["profile.mobile"];
      return next;
    });
  };
  const updateRequirement = (key, value) => {
    setForm((current) => {
      const requirements = { ...current.requirements, [key]: value };
      if (key === "relationship" && !requirementHasOtherRelationship(value)) requirements.relationshipOther = "";
      if (key === "propertyType") {
        requirements.hasStoreys = requirementHasStoreys(value);
        requirements.storeys = requirements.hasStoreys ? (current.requirements.storeys || 1) : null;
      }
      return { ...current, requirements };
    });
    if (key === "propertyType") setErrors((current) => { const next = { ...current }; delete next["requirements.storeys"]; return next; });
    if (key === "relationship" || key === "relationshipOther") setErrors((current) => { const next = { ...current }; delete next["requirements.relationshipOther"]; return next; });
  };
  const startInquiry = (intent) => {
    setForm(emptyRequirement(intent));
    setStep(1);
    trackEvent("inquiry_started", { intent, properties: { entry_path: window.location.pathname } });
  };
  const next = (event) => { event?.preventDefault(); if (step === profileStep && !form.profile.race) { setErrors({ "profile.race": "Choose Malay, Chinese, Indian, or Others." }); window.setTimeout(() => document.getElementById("requirement-race-choice")?.focus(), 0); return; } if (step === 1 && !form.requirements.propertyType) { setErrors({ "requirements.propertyType": "Choose a property type." }); return; } if (step === 1 && !isValidBudgetAmount(form.requirements.budget)) { setErrors({ "requirements.budget": "Enter one positive budget amount." }); return; } if (step === 1 && requirementHasStoreys(form.requirements.propertyType) && !form.requirements.storeys) { setErrors({ "requirements.storeys": "Choose the number of storeys." }); return; } if (step === 2 && form.intent === "rent" && requirementHasOtherRelationship(form.requirements.relationship) && !String(form.requirements.relationshipOther || "").trim()) { setErrors({ "requirements.relationshipOther": "This field is required." }); return; } if (step === 2 && form.intent === "rent" && !parseRequirementDate(form.requirements.moveInDate)) { setErrors({ "requirements.moveInDate": "Enter a valid date as dd/mm/yyyy." }); window.setTimeout(() => document.getElementById("requirement-move-in-date")?.focus(), 0); return; } if (step === 3 && form.intent === "rent" && form.requirements.propertyUsage === "Commercial" && !String(form.requirements.commercialActivity || "").trim()) { setErrors({ "requirements.commercialActivity": "Please state the commercial activity." }); return; } if (step === 4 && form.intent === "rent" && !DEPOSIT_OPTIONS.includes(form.requirements.depositAgreement)) { setErrors({ "requirements.depositAgreement": "Choose Yes or Need to Discuss before reviewing your answers." }); return; } setErrors({}); trackEvent("inquiry_step_completed", { intent: form.intent, properties: { step, step_name: steps[step] } }); if (reviewEditStep !== null) { setReviewEditStep(null); setStep(finalStep); } else setStep((current) => Math.min(finalStep, current + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => { setErrors({}); if (reviewEditStep !== null) { setReviewEditStep(null); setStep(finalStep); } else setStep((current) => Math.max(0, current - 1)); };
  const editReviewSection = (targetStep) => {
    const stepMap = form.intent === "rent" ? { 1: profileStep, 2: 1, 3: 2, 4: 3, 5: 4 } : { 1: profileStep, 2: 1, 3: 2, 4: 3 };
    const resolvedStep = stepMap[targetStep] ?? targetStep;
    setReviewEditStep(resolvedStep);
    setErrors({});
    setStep(resolvedStep);
  };

  const submit = async () => {
    const payload = { ...form, idempotencyKey: submissionKey.current };
    const validation = validateRequirementPayload(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitError("validation");
      return;
    }
    const mobile = isMobileOrTabletDevice();
    const desktopWhatsAppWindow = mobile
      ? null
      : globalThis.open?.("about:blank", "propertydealdesk-whatsapp-business");
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/requirements", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404) throw new Error("This local preview cannot save submissions yet. Please ask the administrator to connect the requirements database before submitting. Your answers are still here.");
        if (response.status === 503) throw new Error(saved.error || "Saving is temporarily unavailable. Please contact the PropertyDealDesk administrator, then try again. Your answers are still here.");
        setErrors(saved.fields || {});
        throw new Error(saved.error || "We could not save your requirement. Please try again.");
      }
      let matches = [];
      let matchingError = "";
      try {
        if (inventory.loading || inventory.error || inventory.meta?.isMockData) throw new Error(inventory.error || "Published inventory is not ready.");
        matches = matchRequirements(validation.value, inventory.items, inventory.locationDictionary, 6);
      } catch {
        matchingError = "Your requirement is saved, but matching is temporarily unavailable. You can still WhatsApp the agent below.";
      }
      const nextResult = { ...saved, submission: validation.value, matches, matchingError };
      setResult(nextResult);
      trackEvent("inquiry_submitted", { intent: validation.value.intent, properties: { reference: saved.reference, match_count: matches.length } });
      const whatsappMessage = requirementWhatsAppMessage(validation.value, saved.reference);
      if (mobile) {
        const whatsappUrl = buildWhatsAppUrl(agentProfile.whatsapp, whatsappMessage);
        if (whatsappUrl) globalThis.location?.assign?.(whatsappUrl);
      } else if (desktopWhatsAppWindow) {
        const whatsappUrl = buildWhatsAppUrl(agentProfile.whatsapp, whatsappMessage, { desktop: true });
        if (whatsappUrl) {
          desktopWhatsAppWindow.location.href = whatsappUrl;
          desktopWhatsAppWindow.focus?.();
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      desktopWhatsAppWindow?.close?.();
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const resultWhatsAppMessage = requirementWhatsAppMessage(result.submission, result.reference);
    const resultWhatsAppDesktop = !isMobileOrTabletDevice();
    const resultWhatsAppUrl = buildWhatsAppUrl(agentProfile.whatsapp, resultWhatsAppMessage, { desktop: resultWhatsAppDesktop });
    const copyWhatsAppMessage = async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
        await navigator.clipboard.writeText(resultWhatsAppMessage);
        setMessageCopied(true);
        window.setTimeout(() => setMessageCopied(false), 1800);
      } catch {
        setWhatsAppError("Unable to copy the WhatsApp message. Please check browser clipboard permissions.");
      }
    };
    return (
    <main className="requirement-page" lang={INQUIRY_LANGUAGES.find(item => item.value === language).locale}><Seo title={`Requirement ${result.reference}`} canonical={`${SITE_ORIGIN}/inquiries`} robots="noindex, follow" />
      <div className="page-width requirement-result">
        <InquiryLanguagePicker />
        <section className="requirement-success"><span className="success-sparkle">✦</span><CheckCircle2 size={36} /><span className="eyebrow"><InquiryText text={"Your search is underway"} /></span><h1>{t("We've got you, {name}.", { name: result.submission.profile.name })}</h1><p><InquiryText text={"Your reference is"} />{" "}<strong>{result.reference}</strong><InquiryText text={". We found a few places to get you started."} /></p></section>
        {result.matchingError ? <div className="requirement-alert warning">{t(result.matchingError)}</div> : null}
        <section className="requirement-whatsapp requirement-next-step" aria-labelledby="requirement-whatsapp-title"><MessageCircle size={28} aria-hidden="true" /><div><span className="eyebrow"><InquiryText text={"Next step"} /></span><h2 id="requirement-whatsapp-title"><InquiryText text={"Send this requirement to HS Ong"} /></h2><p><InquiryText text={"The destination is fixed to the configured PropertyDealDesk agent number."} /></p></div><div className="requirement-whatsapp-actions"><a className="button primary" href={resultWhatsAppUrl || undefined} target={resultWhatsAppDesktop ? "propertydealdesk-whatsapp-business" : "_self"} rel={resultWhatsAppDesktop ? undefined : undefined} onClick={() => { setWhatsAppError(""); trackEvent("inquiry_whatsapp_click", { intent: result.submission.intent, properties: { reference: result.reference } }); }}><MessageCircle size={17} aria-hidden="true" />{" "}<InquiryText text={"WhatsApp Agent"} /></a><button className="button secondary" type="button" onClick={copyWhatsAppMessage}>{messageCopied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} {t(messageCopied ? "Copied" : "Copy message")}</button></div></section>
        <section className="requirement-matches"><div className="section-heading"><div><span className="eyebrow"><InquiryText text={"Recommended properties"} /></span><h2>{t(result.matches.length ? "A few places worth a look" : "We'll keep an eye out")}</h2><p>{t(result.matches.length ? "These are drawn from the current published inventory and matched to your brief." : "Your requirement is saved. HS Ong can help check for suitable options.")}</p></div></div>
          {result.matches.length ? <div className="property-grid result-grid">{result.matches.map((listing, index) => <div className="result-card-reveal" style={{ "--result-delay": `${index * 55}ms` }} key={listing.publicId}><PropertyCard listing={listing} viewOnly /></div>)}</div> : null}
        </section>
        {whatsAppError ? <div className="requirement-alert error">{t(whatsAppError)}{" "}<InquiryText text={"Your submission remains saved. Please try again."} /></div> : null}
        <Link className="button secondary result-home" to="/"><Home size={17} />{" "}<InquiryText text={"Back to Inventory"} /></Link>
      </div>
    </main>
  );
  }

  return (
    <main className="requirement-page" lang={INQUIRY_LANGUAGES.find(item => item.value === language).locale}><Seo title="Find a Property for Me | HS Ong" canonical={`${SITE_ORIGIN}/inquiries`} description="Tell HS Ong your budget, preferred location and requirements to find a property to rent or buy in Klang Valley." />
      <div className="page-width requirement-shell">
        <InquiryLanguagePicker />
        <header className="requirement-intro"><span className="eyebrow"><Search size={14} />{" "}<InquiryText text={"Property requirement"} /></span><h1><InquiryText text={"Find a Property for Me"} /></h1><p><InquiryText text={"Let's find a place that feels right. A few quick choices, then we'll do the searching for you."} /></p></header>
        <div className="requirement-progress-meta"><span>{step === 0 ? t("Let's get started") : t("Step {step} of {total}", { step, total: finalStep })}</span><strong>{step === 0 ? "0%" : t("{percent}% complete", { percent: Math.round((step / finalStep) * 100) })}</strong></div>
        <ol className="requirement-progress" aria-label={t("Form progress")}>{steps.map((label, index) => <li className={index === step ? "active" : index < step ? "complete" : ""} key={label}><span>{index < step ? "✓" : index + 1}</span><small>{t(label)}</small></li>)}</ol>
        <section className="requirement-card">
          {step === 0 ? <div className="intent-picker requirement-step-panel"><span className="step-kicker"><InquiryText text={"First, the fun part"} /></span><h2><InquiryText text={"What kind of move are you making?"} /></h2><p><InquiryText text={"Pick a path and we'll keep the next steps short and simple."} /></p><div><button type="button" onClick={() => startInquiry("rent")}><span>🏠</span><strong><InquiryText text={"I'm Looking to Rent"} /></strong><small><InquiryText text={"Find a comfortable next home"} /></small><b><InquiryText text={"Start renting →"} /></b></button><button type="button" onClick={() => startInquiry("buy")}><span>🏡</span><strong><InquiryText text={"I'm Looking to Buy"} /></strong><small><InquiryText text={"Find a place to call your own"} /></small><b><InquiryText text={"Start buying →"} /></b></button></div></div> : null}

          {step === profileStep ? <form onSubmit={next} className="requirement-step-panel"><StepIntro eyebrow={form.intent === "rent" ? "Tenant Profile" : "Buyer Profile"} title={form.intent === "rent" ? "A little about you" : "A little about you"} description={form.intent === "rent" ? "May I have your basic details for owner reference? Thanks!" : "This helps us recommend homes that fit your lifestyle."} /><div className="requirement-grid">
            <Field label="Name" error={errors["profile.name"]}><input required value={form.profile.name} onChange={(e) => updateProfile("name", e.target.value)} autoComplete="name" /></Field>
            <Field label="Mobile Number" error={errors["profile.mobile"]}><input required type="tel" value={form.profile.mobile} onChange={(e) => updateMobile(e.target.value)} onBlur={validateMobileField} autoComplete="tel" inputMode="tel" aria-describedby={errors["profile.mobile"] ? "requirement-mobile-error" : undefined} /><span id="requirement-mobile-error" className="sr-only">{t(errors["profile.mobile"] || "")}</span></Field>
            <ChoiceTiles id="requirement-race-choice" label="Race" value={form.profile.race} options={RACE_OPTIONS} onChange={updateRace} error={errors["profile.race"]} columns={2} />
            {form.profile.race === "Others" ? <Field label="Please specify" error={errors["profile.raceOther"]}><input required value={form.profile.raceOther} onChange={(e) => updateProfile("raceOther", e.target.value)} /></Field> : null}
            <Field label="Country" error={errors["profile.country"]}><select required aria-label={t("Country")} value={form.profile.country} onChange={(e) => updateCountry(e.target.value)} autoComplete="country-name"><option value="" disabled><InquiryText text={"Select your country"} /></option>{COUNTRY_OPTIONS.map(([name, code]) => <option value={name} key={name}>{t(name)}</option>)}</select></Field>
            {form.profile.country === "Other" ? <Field label="Please specify your country" error={errors["profile.countryOther"]}><input required value={form.profile.countryOther} onChange={(e) => updateProfile("countryOther", e.target.value)} autoComplete="country-name" /></Field> : null}
            <Field label="Occupation" error={errors["profile.occupation"]}><input required value={form.profile.occupation} onChange={(e) => updateProfile("occupation", e.target.value)} /></Field>
            <Field label="Company Name" error={errors["profile.companyName"]}><input required value={form.profile.companyName} onChange={(e) => updateProfile("companyName", e.target.value)} autoComplete="organization" /></Field>
          </div><div className="wizard-actions"><button className="button secondary" type="button" onClick={back}><ArrowLeft size={17} />{" "}<InquiryText text={"Back"} /></button><button className="button primary" type="submit"><InquiryText text={"Review My Answer"} />{" "}<ArrowRight size={17} /></button></div></form> : null}

          {step === 1 ? <PropertyBasicsStep form={form} propertyTypes={propertyTypes} locations={locations} errors={errors} updateRequirement={updateRequirement} onBack={back} onSubmit={next} /> : null}
          {step === 2 ? <HomeFitStep form={form} errors={errors} updateRequirement={updateRequirement} onBack={back} onSubmit={next} /> : null}
          {step === 3 ? <PreferencesStep form={form} errors={errors} updateRequirement={updateRequirement} onBack={back} onSubmit={next} /> : null}

          {form.intent === "rent" && step === 4 ? <form onSubmit={next} className="requirement-step-panel"><StepIntro eyebrow="Deposits and Fees" title="One last practical thing" description="These are the usual rental payments. Is that comfortable for you?" /><ul className="deposit-list"><li><strong><InquiryText text={"1 month"} /></strong>{" "}<InquiryText text={"advance rental"} /></li><li><strong><InquiryText text={"2 months"} /></strong>{" "}<InquiryText text={"security deposit"} /></li><li><strong><InquiryText text={"1 month"} /></strong>{" "}<InquiryText text={"utilities deposit"} /></li><li><InquiryText text={"Tenancy Agreement & legal fees"} /></li></ul><ChoiceTiles label="Are you agreeable?" value={form.requirements.depositAgreement} options={DEPOSIT_OPTIONS} onChange={(value) => updateRequirement("depositAgreement", value)} error={errors["requirements.depositAgreement"]} columns={2} /><div className="wizard-actions"><button className="button secondary" type="button" onClick={back}><ArrowLeft size={17} />{" "}<InquiryText text={"Back"} /></button><button className="button primary" type="submit"><InquiryText text={"My Profile"} />{" "}<ArrowRight size={17} /></button></div></form> : null}

          {step === finalStep && step > 0 ? <div className="requirement-step-panel"><StepIntro eyebrow="Almost there" title="Does everything look right?" description="Take a breath, have a quick look, and edit anything you like before we start matching." /><div className="review-stack"><ReviewSection title={form.intent === "rent" ? "Tenant Profile" : "Buyer Profile"} values={{ ...form.profile, raceOther: form.profile.race === "Others" ? form.profile.raceOther : "" }} labels={{ name: "Name", mobile: "Mobile Number", race: "Race", raceOther: "Race (Other)", country: "Country", countryOther: "Country (Other)", occupation: "Occupation", companyName: "Company Name" }} onEdit={() => editReviewSection(1)} intent={form.intent} /><ReviewSection title="Property Basics" values={{ propertyType: form.requirements.propertyType, storeys: form.requirements.storeys, area: form.requirements.area, budget: form.requirements.budget }} labels={reviewLabels} onEdit={() => editReviewSection(2)} intent={form.intent} /><ReviewSection title="Home Fit" values={{ bedrooms: form.requirements.bedrooms, bathrooms: form.requirements.bathrooms, moveInDate: form.requirements.moveInDate, peopleStaying: form.requirements.peopleStaying, relationship: form.requirements.relationship, relationshipOther: requirementHasOtherRelationship(form.requirements.relationship) ? form.requirements.relationshipOther : "", purchaseTimeline: form.requirements.purchaseTimeline, occupants: form.requirements.occupants }} labels={reviewLabels} onEdit={() => editReviewSection(3)} intent={form.intent} /><ReviewSection title="Preferences" values={form.intent === "rent" ? { propertyUsage: form.requirements.propertyUsage, commercialActivity: form.requirements.propertyUsage === "Commercial" ? form.requirements.commercialActivity : "", pet: form.requirements.pet, furnishing: form.requirements.furnishing, tenancy: form.requirements.tenancy, tenancyPeriod: form.requirements.tenancyPeriod, otherNeeds: form.requirements.otherNeeds } : { purpose: form.requirements.purpose, loan: form.requirements.loan, otherNeeds: form.requirements.otherNeeds }} labels={reviewLabels} onEdit={() => editReviewSection(4)} intent={form.intent} />{form.intent === "rent" ? <ReviewSection title="Deposits and Fees" values={{ depositAgreement: form.requirements.depositAgreement }} labels={reviewLabels} onEdit={() => editReviewSection(5)} intent={form.intent} /> : null}</div><label className={`consent-control ${errors.consent ? "has-error" : ""}`}><input type="checkbox" checked={form.consent} onChange={(e) => { const checked = e.target.checked; setForm((current) => ({ ...current, consent: checked })); if (checked) { setErrors((current) => { const next = { ...current }; delete next.consent; return next; }); setSubmitError((current) => current?.includes("Consent") ? "" : current); } }} /><span><InquiryText text={"I'm happy for my details to be saved and used to respond to my enquiry."} /></span></label>{errors.consent ? <p className="field-error">{t(errors.consent)}</p> : null}{submitError && (submitError !== "validation" || Object.keys(errors).length > 0) ? <div className="requirement-alert error">{submitError === "validation" ? `${t("Please complete the following before submitting:")} ${validationSummary(errors, t)}` : t(submitError)}</div> : null}<div className="wizard-actions"><button className="button secondary" type="button" onClick={back}><ArrowLeft size={17} />{" "}<InquiryText text={"Back"} /></button><button className="button primary submit-requirement" type="button" onClick={submit} disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}{t(submitting ? "Finding your matches…" : "Complete and Submit")}</button></div></div> : null}
        </section>
      </div>
    </main>
  );
}
