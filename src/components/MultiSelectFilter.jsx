import { useSiteLanguage } from "./InquiryLanguage";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { selectedValues, filterMultiSelectOptions } from "../utils/multiSelect.js";

export function MultiSelectFilter({ label, placeholder, options, value, onChange, counts }) {
  const { t: tSite } = useSiteLanguage();
  const selected = selectedValues(value);
  const [search, setSearch] = useState("");
  const root = useRef(null);
  const id = useId();
  const choices = [...new Set([...options, ...selected])].filter(Boolean);
  const filtered = filterMultiSelectOptions(choices, search, counts);
  useEffect(() => {
    const closeOutside = (event) => { if (root.current && !root.current.contains(event.target)) root.current.open = false; };
    const closeEscape = (event) => {
      if (event.key === "Escape" && root.current?.open) {
        root.current.open = false;
        root.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);
  return <div className="multi-select-filter">
    <span id={`${id}-label`} className="multi-select-label">{tSite(label)}</span>
    <details ref={root} className="multi-select-dropdown">
      <summary aria-labelledby={`${id}-label ${id}-value`} title={tSite(selected.join(", ") || placeholder)}>
        <span id={`${id}-value`}>{tSite(selected.length ? `${selected[0]}${selected.length > 1 ? ` +${selected.length - 1}` : ""}` : placeholder)}</span>
        <ChevronDown size={16} />
      </summary>
      <div className="multi-select-menu">
        <input type="search" aria-label={tSite(`Search ${label.toLowerCase()} options`)} placeholder={tSite("Search options")} value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="multi-select-actions"><span>{tSite(selected.length)}{tSite(" selected")}</span><button type="button" onClick={() => onChange([])} disabled={!selected.length}>{tSite("Clear")}</button></div>
        {tSite(counts ? <p className="multi-select-count-note">{tSite("Counts match your other active filters.")}</p> : null)}
        <fieldset className="multi-select-options"><legend className="sr-only">{tSite(label)}</legend>
          {tSite(filtered.map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><span>{tSite(option)}</span>{tSite(counts ? <span className="multi-select-count">{tSite("(")}{tSite(counts.get(option) || 0)}{tSite(")")}</span> : null)}</label>))}
          {tSite(!filtered.length ? <p>{tSite("No matching options")}</p> : null)}
        </fieldset>
      </div>
    </details>
  </div>;
}
