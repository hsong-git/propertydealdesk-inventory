# Combined SMI / CMI catalogue

Both Cloudflare Pages projects use this repository and its `main` branch.
The usual approved inventory Publish commit therefore deploys both catalogues.
No inventory is automatically approved, and demand/closed/deleted entries remain excluded.

| Project | Domain | Production build variable |
| --- | --- | --- |
| propertydealdesk-inventory-catalogue | property.myeviv.com | default (SMI browse only) |
| propertydealdesk-scmi-catalogue | scmi.myeviv.com | VITE_CATALOGUE_MODE=scmi |

Build command: `npm run build`. Output: `dist`.
The combined build includes approved CMI in search, catalogue pages and related matches,
keeps `CMI-` display codes, and uses SCMI canonical/share URLs.
Admin navigation returns to the existing Access-protected property site.
Public inquiry forms use the same protected server handlers and inquiry database.

External DNS requires CNAME `scmi` → `propertydealdesk-scmi-catalogue.pages.dev`.
The custom domain is also registered on the SCMI Pages project.

Regression checks: `node --test scripts/catalogue-site.test.mjs functions/seo-routing.test.js`.
