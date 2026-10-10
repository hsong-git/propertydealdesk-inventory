import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { selectedValues } from "../utils/multiSelect.js";

export function MultiSelectFilter({ label, placeholder, options, value, onChange }) {
  const selected = selectedValues(value);
  const [search, setSearch] = useState("");
  const root = useRef(null);
  const id = useId();
  const choices = [...new Set([...options, ...selected])].filter(Boolean);
  const filtered = choices.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()));
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
    <span id={`${id}-label`} className="multi-select-label">{label}</span>
    <details ref={root} className="multi-select-dropdown">
      <summary aria-labelledby={`${id}-label ${id}-value`} title={selected.join(", ") || placeholder}>
        <span id={`${id}-value`}>{selected.length ? `${selected[0]}${selected.length > 1 ? ` +${selected.length - 1}` : ""}` : placeholder}</span>
        <ChevronDown size={16} />
      </summary>
      <div className="multi-select-menu">
        <input type="search" aria-label={`Search ${label.toLowerCase()} options`} placeholder="Search options" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="multi-select-actions"><span>{selected.length} selected</span><button type="button" onClick={() => onChange([])} disabled={!selected.length}>Clear</button></div>
        <fieldset className="multi-select-options"><legend className="sr-only">{label}</legend>
          {filtered.map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /><span>{option}</span></label>)}
          {!filtered.length ? <p>No matching options</p> : null}
        </fieldset>
      </div>
    </details>
  </div>;
}
