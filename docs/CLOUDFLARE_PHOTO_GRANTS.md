# Secure six-hour photo download grants

## Why a backend is required

The catalogue cannot securely identify HS Ong, keep a signing secret, create an owner-only action, or expire a token from browser JavaScript or a static JSON file. Client-side flags and embedded secrets are visible and forgeable. The legacy `public/data/download-grants.json` must therefore remain empty and is rejected by build validation if it contains a grant.

The implemented minimum boundary is:

```text
HS Ong browser
  -> Cloudflare Access-protected /api/admin/*
  -> Pages Function validates Access JWT + ADMIN_EMAILS allowlist
  -> Function confirms a sanitized private ZIP in R2
  -> random 256-bit token; only its SHA-256 hash is stored in KV for 21,600 seconds
  -> shareable /download/<token>
  -> public token resolver checks KV expiry and streams the private R2 object
```

Normal inventory, galleries and searches remain static. Only `/api/*` invokes Pages Functions. There is no owner/admin page. After HS Ong authenticates to the Access-protected API, each listing detail page discovers the session and shows `Generate photo download link`; unauthenticated visitors render no owner control. The POST Function repeats authorization, same-origin and package checks, so hiding the button is not the security boundary.

## Required Cloudflare resources

1. A Cloudflare Pages project for this repository and its production custom domain.
2. A Workers KV namespace bound as `PHOTO_GRANTS`.
3. A private R2 bucket bound as `PHOTO_PACKAGES`. Do not enable an `r2.dev` public URL or public custom domain.
4. A Cloudflare Access self-hosted application covering `https://<catalogue-host>/api/admin/*`, with an Allow policy limited to HS Ong's identity. Enable an identity provider or email one-time PIN as appropriate.
5. Pages environment variables:
   - `CF_ACCESS_TEAM_DOMAIN`: `<team>.cloudflareaccess.com`
   - `CF_ACCESS_AUD`: Access application audience tag
   - `ADMIN_EMAILS`: comma-separated exact owner/admin login emails
   - `CURRENT_INVENTORY_VERSION`: exact deployed `inventoryVersion`, preventing grants for stale R2 packages
6. Copy `wrangler.example.toml` to an untracked deployment-specific `wrangler.toml`, replace every placeholder, or configure the same bindings and variables in the Cloudflare dashboard.

Cloudflare Access must protect the admin API even though the Function also validates `Cf-Access-Jwt-Assertion`. The Function checks the JWT signature, issuer, audience and email allowlist and fails closed when configuration is absent.

With no separate admin page, HS Ong can authenticate by opening the protected `/api/admin/session` URL once, completing Access login, and returning to a listing detail page. The owner button will then appear while the Access session is valid.

## Private package contract

Run:

```powershell
npm run package:photos
```

This revalidates the public snapshot, rebuilds ignored packages in `artifacts/photo-packages`, and emits `upload-manifest.json`. It includes only the same metadata-free WebPs approved for public display. Upload each ZIP to the private R2 key in its manifest and attach these exact custom metadata values:

```text
sanitized = true
smiCode = WTL0010
title = public-safe listing title
inventoryVersion = 2026.07.27.5
```

The admin Function refuses missing packages, unexpected keys, mismatched SMI codes or inventory versions, or objects without `sanitized=true`. The deploy pipeline must upload the current manifest, remove stale package objects, and set `CURRENT_INVENTORY_VERSION` to the same deployed feed version. Package preparation/upload belongs in the controlled publication pipeline; the public browser never uploads or zips source files. A future Stable-side uploader may consume `upload-manifest.json`, but it must not expose R2 credentials or private object URLs to the catalogue.

## Grant behavior

- `POST /api/admin/photo-grants` accepts only a public supply SMI code and requires a valid Access admin identity and same-origin request.
- Tokens contain 256 random bits and are not the SMI code. KV stores only `SHA-256(token)` plus public-safe package metadata.
- KV uses `expirationTtl: 21600`; the resolver also checks the stored absolute expiry time.
- `/api/photo-grants/<token>` returns only safe display metadata or the same neutral 404 response.
- `/api/photo-download/<token>` streams the private ZIP with `private, no-store` and an attachment filename.
- Links are bearer credentials: anyone receiving one may download until six-hour expiry. Do not put them in analytics, support tickets or public pages.
- KV is eventually consistent across locations, so a newly created link may take up to roughly 60 seconds to resolve in another region. If immediate globally consistent grants become mandatory, replace KV with a Durable Object while retaining R2.

## Local and deployment boundaries

The normal Vite server does not emulate Access, KV or R2; it correctly hides owner controls and returns no working grant API. Use Cloudflare's Pages local runtime with configured local bindings for end-to-end Function testing. Do not add production IDs, Access audience values, credentials or owner-only configuration to Git.

Deployment is blocked until the Pages project, Access application, KV namespace, private R2 bucket, bindings, variables and package upload step exist. A successful static `npm run build` alone does not activate secure grants.
