# PropertyDealDesk Inventory Catalogue

A standalone, public-facing property inventory catalogue for HS Ong (REN 81340). The homepage is the catalogue and includes agent information, client-side search and filters, shareable detail routes, and direct WhatsApp enquiry actions. Its inventory is supplied by an approved public-safe static export from PropertyDealDesk Production Stable.

## Project boundary and safety

This repository is independent from PropertyDealDesk Production Stable. It must remain in `D:\Codex\PropertyDealDesk-Inventory` and must never directly read from, write to, or expose the Stable database, local API, local computer, IP address, database port, or development server.

The production flow is one-way only:

```text
PropertyDealDesk Production Stable SMI
        ↓ explicit approval for publication
Public-safe static export
        ↓
PropertyDealDesk-Inventory/public/data/inventory.json
+ approved public files in public/inventory/<SMI_CODE>
        ↓ static build/deployment
PropertyDealDesk Inventory Catalogue
```

Production Stable remains the source of truth. The catalogue only consumes a reviewed static snapshot and never writes back to Stable. No Stable export button or export script is implemented by this project; that Stable-side work requires separate approval from HS Ong.

## Local setup

Requirements: Node.js 20 or newer and npm.

```powershell
cd "D:\Codex\PropertyDealDesk-Inventory"
npm install
npm run dev
```

Vite is configured with a strict local address: `http://127.0.0.1:5277/`. It will fail instead of silently choosing another port.

### Double-click start and stop

For normal local use, double-click `Start Inventory Catalogue.bat` in File Explorer. It starts the catalogue at `http://127.0.0.1:5277/`, records the exact server process in `.runtime`, and runs `npm install` automatically if Vite is missing.

Double-click `Stop Inventory Catalogue.bat` to stop only the server recorded by the start script. It will not terminate an unrelated Node/Vite process. If port 5277 is occupied by an untracked process, the scripts report that condition and leave the process unchanged.

Runtime PID and log files are stored in the ignored `.runtime` directory. The command-line alternative remains `npm run dev`, but a server started that way is intentionally not controlled by the Stop BAT file.

Create a production build with:

```powershell
npm run build
```

The build automatically runs `npm run validate:inventory` first. Validation checks the JSON contracts, unique public IDs and slugs, publication mode, all referenced photo files, the public image privacy/size policy, and any static download grants. The static output is written to `dist`.

## Main content locations

- `src/config/agentProfile.js` — single source for agent identity, contact details, service areas and public copy.
- `public/data/inventory.json` — current Stable-generated, public-safe inventory snapshot.
- `public/data/inventory.schema.json` — strict machine-readable contract for Stable-generated public exports.
- `public/data/download-grants.json` — unlisted, opaque-token download grants; empty unless HS Ong explicitly grants one.
- `public/data/download-grants.schema.json` — strict manifest contract for authorized ZIP packages.
- `public/profile` — copied and optimized portrait and name card assets.
- `public/inventory/<SMI_CODE>` — Stable-generated public photo directories.
- `public/properties` — development-only mock photo assets.
- `docs/STABLE_EXPORT_HANDOFF.md` — exact Stable-to-catalogue field and behavior handoff.
- `src/styles/theme.css` — central PropertyDealDesk-derived design tokens.
- `public/_redirects` — SPA fallback for Cloudflare Pages routes.

## Production Stable export contract

The canonical production contract uses this exact envelope:

```json
{
  "schema": "propertydealdesk-public-inventory",
  "schema_version": "1.0",
  "inventoryVersion": "2026.07.27.1",
  "generated_at": "2026-07-27T01:30:00Z",
  "publishedAt": "2026-07-27T01:30:00Z",
  "isMockData": false,
  "notice": "Optional public text",
  "listings": []
}
```

Production listing fields use a strict snake_case allowlist. Only separately PUBLIC-approved active `WTS` and `WTL` supply listings belong in `listings[]`. See [the Stable export handoff](docs/STABLE_EXPORT_HANDOFF.md) and `public/data/inventory.schema.json` for the complete required/optional field contract.

Unknown fields fail pre-build schema validation. The browser loader also constructs a fresh allowlisted object and ignores all unknown source keys, so internal notes, contact details, database IDs and other accidental source fields are never used by the UI.

The first real Stable snapshot was published on 27 July 2026 as inventory version `2026.07.27.1`, with `isMockData: false`. Any future development fixture must remain clearly marked as mock data and must not be presented as HS Ong's real inventory.

## Replacing images

Agent details and paths are configured in `src/config/agentProfile.js`. Keep production portrait and name-card files inside `public/profile`; do not link to OneDrive or another local source path.

Stable must place optimized listing images inside `public/inventory/<SMI_CODE>` and reference them using exact root-relative paths such as `/inventory/WTS1004/cover.webp`. Every path must remain below the matching listing-code directory. Prefer WebP and remove metadata that is not required for publication.

The files in `public/properties` are retained development-only fixtures and are not referenced by the real Stable feed. Public deployment must use only listing-specific, approved files under `public/inventory` with unnecessary metadata removed.

### Public image privacy and optimization

Production display assets must be WebP copies with EXIF orientation applied before resizing, a longest edge no greater than 1920px from Stable (the catalogue rejects anything above its defensive 2560px ceiling), and no EXIF, GPS, device, date, ICC or XMP metadata. Stable currently exports at WebP quality 82. Build validation rejects metadata, non-WebP production assets, unreadable files, and over-dimension images. It warns when a file exceeds 2 MiB or the referenced display package exceeds 150 MiB.

Property images have no visible download button, cannot normally be dragged, and suppress the browser context menu. These are deterrents only. Any image delivered to a public browser can still be saved through screenshots, browser developer tools, network requests, cache inspection or other means. True protection requires authenticated storage and signed, expiring URLs; a static Cloudflare Pages site cannot provide that security.

### Owner-granted image download links

HS Ong may separately authorize an unlisted static link for one SMI. Stable generates a random URL-safe token (32–128 characters), a ZIP under `public/downloads/<token>/`, and one entry in `public/data/download-grants.json`. The catalogue route is `/download/<token>`; it is never linked from a property card, gallery, navigation or public index.

Each grant contains only `token`, `smi_code`, `title`, `package_path`, `generated_at`, and optional `expires_at`, `file_count` and `notice`. The package path must be `/downloads/<same-token>/<safe-file>.zip`. Invalid, absent, expired or revoked grants show the same neutral unavailable page. Revocation or expiry takes effect on the next static publication by removing the manifest entry and package.

An opaque token is difficult to guess but is not authentication. Anyone who receives the link can use or forward it until it is removed. If genuine access control is required later, use a backend or object storage with identity checks and signed expiring download URLs.

## Cloudflare Pages deployment

This project is a static Vite site and requires no permanent backend.

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: Vite

`public/_redirects` ensures React Router paths such as `/property/example-slug` resolve to the SPA entry point on Cloudflare Pages.

## Future approved SMI export checklist

1. In Production Stable, select SMI records explicitly approved for public publication.
2. Generate a static feed matching `public/data/inventory.schema.json` with `isMockData: false` and the exact schema/version envelope documented above.
3. Export only the documented public-safe snake_case fields; use `public_id` only when it is an opaque public identity rather than a database key.
4. Copy and optimize only approved property photos into `public/inventory/<SMI_CODE>` using `/inventory/<SMI_CODE>/...` paths.
5. Place the reviewed JSON and photo copies in this standalone repository through a manual synchronization or deployment step.
6. Validate the schema, image paths, public content and absence of private data before building.
7. Build and deploy the static catalogue independently.
8. Never add a browser-to-Stable connection or a public-to-local write path.

Implementing the Production Stable export control or generator is deliberately outside this catalogue task and requires separate authorization.

## Manual testing checklist

- [ ] Root URL immediately shows the profile, search controls and listings.
- [ ] Keyword search matches title, area, type and listing code.
- [ ] Every filter, active-filter count, sort option and Reset Filters works.
- [ ] Mobile advanced filters open in a sheet and can be closed.
- [ ] The matching count equals the current Stable feed and Load More reveals all matching records.
- [ ] A production snapshot does not show the development mock-inventory notice.
- [ ] Every property card opens its shareable `/property/:slug` route.
- [ ] Detail galleries, back links and missing-property states work.
- [ ] Property display images reject drag-save and context-menu actions without losing useful alt text.
- [ ] No `/download/` link is exposed by normal catalogue pages when the grant manifest is empty.
- [ ] Invalid, missing, expired and revoked grant tokens show the neutral unavailable page.
- [ ] Every active grant resolves only to its token-scoped ZIP and disappears on the next publish after revocation.
- [ ] WhatsApp links contain the correct agent number, listing code and title.
- [ ] Call buttons appear on mobile layouts and email links open an email client.
- [ ] Share uses the device share sheet or copies the listing URL.
- [ ] About, Contact, navigation menu and name-card modal are keyboard accessible.
- [ ] Layout is checked at 320px, 375px, 768px, 1024px and a wide desktop size.
- [ ] A direct refresh on About, Contact and property routes works in the target host.
- [ ] `npm run build` completes and `dist` contains `_redirects` and inventory data.
- [ ] No local database, API endpoint, private note, exact owner detail or local path appears in the built output.
- [ ] All production display images are optimized WebP, at most 2560px, and contain no EXIF/GPS/device/date/ICC/XMP metadata.
- [ ] A Stable production feed validates against `inventory.schema.json` and contains only separately PUBLIC-approved active WTS/WTL records.

## Source control

Do not commit or push changes unless HS Ong explicitly approves it in the active task.
