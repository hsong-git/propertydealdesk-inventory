# Production Stable → Inventory Catalogue handoff

This is the catalogue-side contract for the one-way public publishing boundary. Production Stable remains the source of truth. The public catalogue never connects to Stable and never writes back.

## Canonical output locations

```text
D:\Codex\PropertyDealDesk-Inventory\public\data\inventory.json
D:\Codex\PropertyDealDesk-Inventory\public\inventory\<SMI_CODE>\<public-photo-file>
```

The Stable publisher should replace the complete generated snapshot. Files for listings that are no longer published should be removed from the generated `public/inventory` package as part of Stable's atomic/recoverable publishing workflow.

## Required feed envelope

| Key | Type | Rule |
| --- | --- | --- |
| `schema` | string | Exactly `propertydealdesk-public-inventory` |
| `schema_version` | string | `1.0` or `1.1`; new Stable snapshots with `posting_copy` use `1.1` |
| `inventoryVersion` | string | Non-empty public version; UTC publication timestamp or monotonic export ID recommended |
| `generated_at` | ISO date-time | Time Stable generated the snapshot |
| `publishedAt` | ISO date-time | Time the snapshot was published; may equal `generated_at` |
| `isMockData` | boolean | Must be `false` for Stable output |
| `listings` | array | Complete current set of PUBLIC-approved active supply records |

Optional feed key: `notice`, containing public-safe display text. No other top-level keys are allowed.

An empty `listings: []` is valid. The catalogue displays its ordinary no-results state.

## Production listing allowlist

Canonical listing keys use snake_case.

### Required

| Key | Type | Rule |
| --- | --- | --- |
| `code` | string | Public SMI code beginning `WTS` or `WTL` |
| `intent` | enum | `WTS` or `WTL` only |
| `slug` | string | Lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`; keep stable where practical |
| `title` | string | Non-empty public title |
| `property_type` | string | Non-empty public property type |
| `location` | string | Public-safe locality; no private exact address unless explicitly approved |
| `price` | number or null | Non-negative asking price/rent; null means price on request |
| `availability` | enum | `Available`, `Available Soon`, `Viewing by Appointment`, `Under Offer`, or `Reserved` |
| `updated_at` | ISO date/date-time | Public record update time. ISO date-time with at least minute precision is preferred so `Recently updated` can order the latest Stable upload/update above older records. |
| `cover_photo` | string or null | Matching `/inventory/<SMI_CODE>/<file>` path, or null |
| `photos` | string[] | Matching public paths; when cover exists, `photos[0]` must equal `cover_photo` |

### Optional

| Key | Type | Notes |
| --- | --- | --- |
| `public_id` | string | Opaque public identity only; defaults to `code`; never a database primary key |
| `description` | string or null | Public-safe description |
| `bedroom_count` | non-negative integer or null | |
| `bathroom_count` | non-negative integer or null | |
| `built_up_sqft` | non-negative number or null | |
| `land_size` | string or null | Public display value |
| `furnishing` | string or null | |
| `facing_direction` | string or null | |
| `unit_type` | string or null | |
| `featured` | boolean | Defaults to false |
| `created_at` | ISO date/date-time or null | ISO date-time with at least minute precision is preferred when available. The catalogue's default recent sort uses the later of `created_at` and `updated_at`. |
| `posting_copy` | string or null | Public-safe Stable SMI Copy output. When present, the catalogue preserves this copy body and ensures the standard `/i/<SMI_CODE>` co-broke short-link footnote exists exactly once in Posting details. Maximum 8000 characters. |
| `features` | string[] | Public content only |
| `amenities` | string[] | Public content only |
| `why_this_property` | string[] | Public content only |

No other listing keys are accepted by pre-build validation.

`posting_copy` is the preferred source for the detail-page Posting details block. Production Stable should populate it from the actual approved SMI Copy output after removing internal/private content. Stable may include the standard footnote itself, but the catalogue also appends/deduplicates it as a backward-compatible safety net. The required footnote is:

```text
🤝 Co-broke welcome
🏠 Listing details & photos:
https://property.myeviv.com/i/<SMI_CODE>
```

The catalogue keeps a reconstructed public-field fallback only for older snapshots that do not yet include this key, and that fallback also includes the same footnote.

## Publication and lifecycle rules

- PUBLIC approval is a separate explicit publication state in Stable. It must not reuse the remote-client Approved SMI state.
- Stable exports only PUBLIC-approved active `WTS` and `WTL` supply records.
- Do not export the internal approval flag or state. Presence in `listings[]` is authoritative.
- Buyer/tenant request records, closed, sold, rented, unpublished and deleted records are absent.
- If a record is absent from the next generated snapshot, it disappears from catalogue results after the next build. Its old detail route returns Property not found.
- The loader requests `inventory.json` without browser caching and rebuilds its inventory solely from the current array; it keeps no historical listing state.

## Photo rules

- Use `/inventory/<exact SMI_CODE>/<filename>` root-relative paths.
- Every path must stay below its matching code directory.
- Filenames may contain letters, digits, dots, underscores and hyphens; no spaces, URLs, drive paths or `..` segments.
- Production display output is WebP-only: quality 82, Pillow method 4, EXIF orientation applied before resize, and a 1920px longest edge. Omit EXIF, GPS, device, date, ICC and XMP metadata. The catalogue defensively rejects metadata, non-WebP production files, unreadable images and dimensions above 2560px; it warns above 2 MiB per file or 150 MiB total.

## Private photo package handoff

Static grants are disabled; `public/data/download-grants.json` must remain empty. Secure six-hour grants are created at runtime by Access-authenticated Pages Functions, stored as token hashes in KV, and streamed from private R2. Stable does not generate tokens or place ZIP files below `public`.

The controlled publication pipeline may run `npm run package:photos` after the catalogue snapshot is written. Upload each ignored ZIP according to `artifacts/photo-packages/upload-manifest.json`, using the exact R2 key and `sanitized`, `smiCode` and public-safe `title` custom metadata. See [Cloudflare photo grants](CLOUDFLARE_PHOTO_GRANTS.md) for the full contract. R2 credentials, object URLs and internal Stable data must never enter this repository or browser payloads.
- `cover_photo` may be null and `photos` may be empty. The catalogue shows a neutral no-photo placeholder.
- Missing referenced files fail `npm run build` before Vite builds.

## Privacy and failure behavior

The JSON Schema has `additionalProperties: false`, so unknown fields stop the build. Separately, the browser normalizer creates a new object containing only the documented public fields and ignores all other source keys. This defense-in-depth prevents fields such as these from reaching the UI:

- owner/landlord private contact details;
- exact private addresses not explicitly approved;
- internal notes, commissions and matching metadata;
- local database IDs and local file paths;
- Stable API, device, IP, port or filesystem information.

Malformed listings missing `code`, valid supply `intent`, `title` or `location` are ignored by the runtime, while the validator fails the build. Invalid availability states and non-supply intents are also ignored defensively at runtime.

## Stable pre-handoff checks

From the catalogue repository:

```powershell
npm run validate:inventory
npm run build
```

Both commands must pass after Stable writes the new snapshot. A valid Stable-shaped example is available at `scripts/fixtures/stable-inventory.sample.json` and can be checked with:

```powershell
node scripts/validate-inventory.mjs scripts/fixtures/stable-inventory.sample.json
```
