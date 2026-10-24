# Combined SMI / CMI catalogue

Both Cloudflare Pages projects use this repository and its `main` branch.
The usual approved inventory Publish commit therefore deploys both catalogues.
No inventory is automatically approved, and demand/closed/deleted entries remain excluded.

| Project | Domain | Production build variable |
| --- | --- | --- |
| propertydealdesk-inventory-catalogue | property.myeviv.com | default (SMI browse only) |
| propertydealdesk-scmi-catalogue | scmi.myeviv.com | VITE_CATALOGUE_MODE=scmi |

Cloudflare build commands (set on the project itself, for both Production and Preview):
- Property: `npm run build:property`
- SCMI: `npm run build:scmi`

Output: `dist`. SCMI must not use the generic `npm run build`: its Production
mode variable was missing on 24 October 2026 while Preview still had it, causing
Git inventory publishes to deploy the SMI-only app to SCMI.

For an approved manual production deployment use `npm run deploy:property` or
`npm run deploy:scmi`. Each rebuilds with an explicit mode, checks the mode marker
and bundle hash in `dist/catalogue-build.json`, and targets its fixed Pages project.
Do not deploy a previously built shared `dist` directory using a raw Wrangler command.
After deployment verify the live `/catalogue-build.json` mode and the CMI filter
in a browser; a successful upload alone does not confirm the correct catalogue.
The combined build includes approved CMI in search, catalogue pages and related matches,
keeps `CMI-` display codes, and uses SCMI canonical/share URLs.
Admin navigation returns to the existing Access-protected property site.
Public inquiry forms use the same protected server handlers and inquiry database.

External DNS requires CNAME `scmi` → `propertydealdesk-scmi-catalogue.pages.dev`.
The custom domain is also registered on the SCMI Pages project.

Regression checks: `node --test scripts/catalogue-site.test.mjs functions/seo-routing.test.js`.
