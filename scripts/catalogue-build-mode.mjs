export const CATALOGUE_PROJECTS = {
  property: "propertydealdesk-inventory-catalogue",
  scmi: "propertydealdesk-scmi-catalogue",
};

export function catalogueBuildMode(env = process.env) {
  const requested = env.VITE_CATALOGUE_MODE || "property";
  if (!Object.hasOwn(CATALOGUE_PROJECTS, requested)) throw new Error(`Unknown catalogue mode: ${requested}`);
  const projectUrl = env.CF_PAGES_URL || "";
  const expected = Object.entries(CATALOGUE_PROJECTS).find(([, project]) => {
    try { const host = new URL(projectUrl).hostname; return host === `${project}.pages.dev` || host.endsWith(`.${project}.pages.dev`); } catch { return false; }
  })?.[0];
  if (expected && requested !== expected) throw new Error(`Refusing ${requested} build for ${CATALOGUE_PROJECTS[expected]}. Use npm run build:${expected}.`);
  return requested;
}
