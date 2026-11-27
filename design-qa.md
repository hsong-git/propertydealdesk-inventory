# Three-step home section — visual check

- Source visual: `.runtime/journey-reference.png` (802 × 290 pixels).
- Implementation: `.runtime/journey-preview.jpg` (1280 × 720 viewport, desktop).
- Combined comparison: `.runtime/journey-comparison.png`. Source retained at 802px wide; implementation section (1201 × 253 CSS pixels) scaled to 802px for composition comparison. Not a 1:1 typography comparison.
- State: English catalogue, six cards loaded; new section directly above Co-broke box.

## Findings

No actionable P0/P1/P2 findings in the desktop section.

- Typography: uses existing site font, bold heading and card titles, readable body copy. Intentional adaptation to the existing theme rather than a pixel-identical copy.
- Spacing/layout: three equal cards with consistent padding and gaps, ordered heading/icon/body content, directly above the existing Co-broke panel.
- Colors: existing green primary and soft-green surface tokens replace reference gold/grey as requested.
- Assets: library search, house and key icons match the reference meanings; no raster artwork or generated assets required.
- Copy: all supplied English copy retained, with Malay and Chinese translations.
- Full-view and focused evidence: the source and implementation section appear together in the comparison image; all section details are readable there. Additional crop not required.

## Comparison history

First comparison passed. No P0/P1/P2 visual correction loop required.

## Verification and remaining test gaps

- Property tools/translation checks and local production build passed.
- Desktop preview inspected at 1280px and existing 832px layout; no horizontal overflow observed at 832px.
- CSS stacks cards below 640px. A requested browser viewport override did not change the observed 832px viewport, so narrow-mobile visual verification remains unconfirmed; override reset afterward.
- New section is informational and adds no interactive controls.

## Implementation checklist

- [x] Section and three steps above Co-broke.
- [x] Existing theme and icon system reused.
- [x] Copy translations supplied.
- [x] Desktop browser comparison completed.
- [ ] Narrow-mobile visual check when a resizable preview is available.

## Requested redesign — 27 November 2026

- Source: prior rendered section in `.runtime/journey-preview.jpg`, plus the user's browser annotations requesting a cleaner design and a Find a Property link.
- Updated implementation: `.runtime/journey-redesign.jpg` (1280 × 720 CSS viewport); section crop is 1201 × 374 pixels, density 1.
- Same-input before/after comparison: `.runtime/journey-redesign-comparison.png`, both crops scaled equally to 802px wide.
- Intentional redesign: one white container, soft-green first step, subtle dividers, numbered steps and consistent library icon tiles. Existing type, palette and section placement retained. All copy retained, with visible numerical prefixes moved into step markers.
- Typography, spacing, token colors, icon quality and copy reviewed together in the comparison. No actionable P0/P1/P2 findings.
- First-step Find a Property link clicked and verified to navigate to `/inquiries`; returned to the section afterward. Keyboard-focus styling provided.
- Targeted tests and production build passed. Narrow-mobile visual check remains a residual test gap as noted above; CSS uses one stacked column below 640px.

final result: passed
