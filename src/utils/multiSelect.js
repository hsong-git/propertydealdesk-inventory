export const multiSelectKeys = new Set(["propertyType", "location", "furnishing"]);

export function selectedValues(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

export function matchesSelection(value, selection) {
  const values = selectedValues(selection);
  return !values.length || values.includes(value);
}

export function normalizeMultiFilters(filters) {
  return { ...filters, ...Object.fromEntries([...multiSelectKeys].map((key) => [key, selectedValues(filters[key])])) };
}

export function readFilterParams(params, keys, defaults) {
  const filters = { ...defaults };
  for (const [filterKey, queryKey] of Object.entries(keys)) {
    if (params.has(queryKey)) filters[filterKey] = multiSelectKeys.has(filterKey) ? selectedValues(params.getAll(queryKey)) : params.get(queryKey) || "";
  }
  return normalizeMultiFilters(filters);
}

export function writeFilterParams(filters, keys, defaults) {
  const params = new URLSearchParams();
  for (const [filterKey, queryKey] of Object.entries(keys)) {
    const value = filters[filterKey];
    if (multiSelectKeys.has(filterKey)) {
      for (const selected of selectedValues(value)) params.append(queryKey, selected);
    } else if (value && value !== defaults[filterKey]) params.set(queryKey, value);
  }
  return params;
}
