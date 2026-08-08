# Email-bound catalogue photo downloads

## Scope

HS Ong grants a recipient email catalogue-wide photo access. The recipient can browse the public catalogue normally, then open any individual SMI page and download all photos for that SMI. There is no catalogue-wide bulk ZIP and no public download control.

The access window is:

```text
Grant created
  -> valid for 24 hours maximum
  -> first successful recipient authentication
  -> valid for one hour after first access
```

An unauthenticated request or an email-security scanner does not start the one-hour window. A sent URL cannot be erased from a mailbox; expiry and revocation make it unusable and remove it from the owner’s active-grant view.

## Runtime boundary

```text
HS Ong owner session
  -> Access-protected POST /api/admin/photo-grants with recipient email
  -> Pages Function stores SHA-256 token hash in D1
  -> recipient opens /download/<token>
  -> recipient Access OTP verifies the exact granted email
  -> POST /api/photo-grants/activate sets an HttpOnly session cookie
  -> public property page checks the cookie for its own SMI code
  -> Pages Function streams that SMI's private, watermarked ZIP from R2
```

The public React site never receives the recipient email, raw grant database row, R2 key or package URL. Public property pages only make a no-store availability request; unauthenticated visitors receive the same neutral 404 response as any unavailable grant.

## Required Cloudflare resources

1. A Cloudflare Pages project for this repository and its production custom domain.
2. A separate D1 database bound as `PHOTO_GRANTS_DB`, with migration `migrations/0002_catalogue_photo_grants.sql` applied.
3. A private R2 bucket bound as `PHOTO_PACKAGES`. Do not enable its public development URL (`r2.dev`) or a public custom domain. [R2 access controls](https://developers.cloudflare.com/r2/buckets/public-buckets/)
4. An owner Access application covering `/api/admin/*`, with an Allow policy limited to HS Ong's exact identity.
5. A recipient Access application covering `/download/*`, `/api/photo-grants/*` and `/api/photo-grants/activate`. Configure email OTP or another identity provider that yields an email claim. The Function still checks the JWT email against the D1 grant; Access authentication is not the per-grant authorization boundary.
6. Pages variables/secrets:
   - `CF_ACCESS_TEAM_DOMAIN`: `<team>.cloudflareaccess.com`
   - `CF_ACCESS_AUD`: owner Access application audience
   - `CF_ACCESS_RECIPIENT_AUD`: recipient Access application audience
   - `ADMIN_EMAILS`: comma-separated exact owner/admin emails
   - `CURRENT_INVENTORY_VERSION`: the snapshot used to build packages

Pages Functions support D1 and R2 bindings through Wrangler or the Pages dashboard. [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)

## Package contract

Run:

```powershell
npm run package:photos
```

The command validates the current public snapshot and creates ignored ZIPs in `artifacts/photo-packages`. Each ZIP contains every unique public photo for one SMI. Every image is re-encoded as WebP with the embedded watermark:

```text
TRR HS Ong
property.myeviv.com
```

The source is always the sanitized public display copy, never a Stable master photo. EXIF/GPS/device/date/ICC/XMP metadata is not retained.

Upload each package according to `upload-manifest.json` using versioned R2 keys:

```text
packages/<inventoryVersion>/<SMI_CODE>.zip
```

Required R2 custom metadata:

```text
sanitized = true
watermarked = true
watermarkVersion = trr-hs-ong-v1
smiCode = WTL0055
inventoryVersion = 2026.08.07.1
photoCount = 12
title = public-safe listing title
```

The Functions refuse missing packages, wrong SMI codes, wrong inventory versions, unwatermarked packages or packages without the approved metadata markers. Versioned packages allow a short-lived grant to remain pinned to the snapshot it was created against; the publication pipeline must retain old package versions for at least 25 hours before cleanup.

## Grant endpoints

- `POST /api/admin/photo-grants` — owner-only; body `{ "email": "agent@example.com" }`.
- `GET /api/photo-grants/<token>` — recipient Access identity check and safe grant status.
- `POST /api/photo-grants/activate` — exact-email check, first-access transition and HttpOnly session cookie.
- `GET /api/catalogue-photo-grants/<SMI_CODE>` — no-store availability check using the session cookie.
- `GET /api/catalogue-photo-download/<SMI_CODE>` — streams only that SMI's private ZIP.

All download responses use `private, no-store`, `nosniff` and `no-referrer`. A wrong email, invalid token, expired grant, revoked grant, missing session or unsafe package returns the same neutral unavailable response.

## Local testing and deployment

The normal Vite server does not emulate Cloudflare Access, D1 or R2. It correctly renders no recipient control without an active session. Use `wrangler pages dev dist` with local D1/R2 bindings for end-to-end Function testing; never place production IDs, Access audience values or credentials in Git.

Static build success does not activate grants. Production requires the D1 migration, two Access applications, private R2 packages, bindings, variables, and the package upload/retention step.
