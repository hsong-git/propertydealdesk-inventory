// One approved export and codebase, with a separate build for each catalogue.
const buildEnv = import.meta.env || globalThis.process?.env || {};
export const COMBINED_CATALOGUE = buildEnv.VITE_CATALOGUE_MODE === "scmi";
export const CATALOGUE_ORIGIN = COMBINED_CATALOGUE
  ? "https://scmi.myeviv.com"
  : "https://property.myeviv.com";
export const PUBLIC_ADMIN_ORIGIN = "https://property.myeviv.com";
