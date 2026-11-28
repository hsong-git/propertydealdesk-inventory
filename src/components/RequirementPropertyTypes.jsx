import { useInquiryLanguage } from "./InquiryLanguage";
import { INQUIRY_PROPERTY_TYPE_OPTIONS, requirementPropertyChoices, requirementHasStoreys, requirementStoreysLabel } from "../data/requirementContract.js";
import { FLOOR_PREFERENCES, requirementHasFloorPreference, requirementNeedsStoreys } from "../data/requirementContract.js";

export function RequirementPropertyTypes({ requirements, onChange, error }) {
  const { t } = useInquiryLanguage();
  const options = INQUIRY_PROPERTY_TYPE_OPTIONS;
  const choices = requirementPropertyChoices(requirements).map(choice => ({ ...choice, isCustom: choice.isCustom || !options.includes(choice.propertyType) }));
  const custom = choices.find(choice => choice.isCustom);
  const toggle = type => onChange(choices.some(choice => !choice.isCustom && choice.propertyType === type)
    ? choices.filter(choice => choice.isCustom || choice.propertyType !== type)
    : [...choices, { propertyType: type, storeys: requirementNeedsStoreys(type) ? 1 : null, floorPreference: "" }]);
  const update = (index, patch) => onChange(choices.map((choice, i) => i === index ? { ...choice, ...patch } : choice));
  return <>
    <fieldset className={`requirement-choice-field tile-choice-field property-type-picker ${error ? "has-error" : ""}`} style={{ "--choice-columns": 2 }}>
      <legend>{t("Property Type")}</legend><p className="text-muted">{t("Select one or more property types.")}</p>
      <div className="requirement-tiles">{options.map(type => {
        const selected = choices.some(choice => !choice.isCustom && choice.propertyType === type);
        return <button type="button" key={type} aria-pressed={selected} className={selected ? "active" : ""} onClick={() => toggle(type)}>{t(type)}</button>;
      })}<button type="button" aria-pressed={Boolean(custom)} className={custom ? "active" : ""} onClick={() => onChange(custom ? choices.filter(choice => !choice.isCustom) : [...choices, { propertyType: "", storeys: 1, isCustom: true }])}>{t("Other")}</button></div>
      {custom ? <input className="choice-custom-input" required maxLength={120} aria-label={t("Other property type")} placeholder={t("Type a property type")} value={custom.propertyType} onChange={event => update(choices.indexOf(custom), { propertyType: event.target.value })} /> : null}
      {error ? <em role="alert">{t(error)}</em> : null}
    </fieldset>
    <div className="requirement-type-attributes">{choices.map((choice, index) => requirementHasStoreys(choice.propertyType) ? <section className="requirement-type-attribute" key={choice.isCustom ? "custom" : choice.propertyType}>
      <h3>{t(choice.propertyType || "Other")}</h3>{requirementHasFloorPreference(choice.propertyType) ? <fieldset className="requirement-choice-field"><legend>{t("Floor preference")}</legend><div className="requirement-tiles" style={{ "--choice-columns": 3 }}>{FLOOR_PREFERENCES.map(floor => <button type="button" key={floor} aria-pressed={choice.floorPreference === floor} className={choice.floorPreference === floor ? "active" : ""} onClick={() => update(index, { floorPreference: floor, storeys: null })}>{t(`${floor} floor`)}</button>)}</div></fieldset> : <fieldset className="requirement-stepper-field"><legend>{t(requirementStoreysLabel(choice.propertyType))}</legend>
        <div className="requirement-stepper"><button type="button" aria-label={t("Decrease {label}", { label: t(requirementStoreysLabel(choice.propertyType)) })} disabled={Number(choice.storeys) <= 1} onClick={() => update(index, { storeys: Math.max(1, Number(choice.storeys) - 1) })}>−</button><strong>{choice.storeys ?? 1}</strong><button type="button" aria-label={t("Increase {label}", { label: t(requirementStoreysLabel(choice.propertyType)) })} disabled={Number(choice.storeys) >= 20} onClick={() => update(index, { storeys: Math.min(20, Number(choice.storeys || 1) + 1) })}>+</button></div>
      </fieldset>}
    </section> : null)}</div>
  </>;
}
