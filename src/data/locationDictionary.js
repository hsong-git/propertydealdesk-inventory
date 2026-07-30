import { fallbackLocationDictionary, normalizeLocationDictionary } from "../utils/locationFilter";

const LOCATION_DICTIONARY_URL = "/data/location_dictionary.json";

export async function loadLocationDictionary() {
  try {
    const response = await fetch(`${LOCATION_DICTIONARY_URL}?v=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fallbackLocationDictionary;
    return normalizeLocationDictionary(await response.json());
  } catch {
    return fallbackLocationDictionary;
  }
}
