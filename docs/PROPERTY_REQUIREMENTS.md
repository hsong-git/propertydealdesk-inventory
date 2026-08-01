# Public property requirements

The public form uses a strict server boundary. The browser posts to `/api/requirements`; only the Pages Function can access the dedicated `REQUIREMENTS_DB` D1 binding. The public client has no database credentials and no endpoint for reading submissions.

The D1 store is intentionally separate from Stable. Stable remains the private source of truth for inventory, and its database and publication workflow are not changed. Matching reads only the current normalized `public/data/inventory.json` snapshot, whose presence contract means PUBLIC-approved, published, active WTS/WTL supply.

## Provisioning (not performed automatically)

1. Create separate preview and production D1 databases.
2. Copy `wrangler.example.toml` to the deployment configuration and replace the D1 IDs.
3. Apply `migrations/0001_property_requirements.sql` to preview first, validate, then apply it to production.
4. Configure Cloudflare Access for `/admin/*` and retain the existing Access JWT variables (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAILS`).
5. Confirm `/api/admin/requirements*` is covered by the same Access application. The Functions also validate the Access JWT and administrator allowlist, so they fail closed even if a route rule is misconfigured.

The admin APIs support list, detail, mark-as-read, and delete only. Public submission responses contain only the new reference and timestamp. There is no public submission lookup endpoint.
