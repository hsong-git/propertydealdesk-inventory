# Design QA — Catalogue annotation pass

## Comparison target

- Source visual truth: browser annotation screenshots supplied in the current task for the Property detail, About, and Contact pages at a 970 × 912 viewport.
- Implementation screenshots:
  - `docs/qa/property-lightbox-970x912.png`
  - `docs/qa/property-posting-970x912.png`
  - `docs/qa/about-970x912.png`
  - `docs/qa/contact-970x912.png`
  - `docs/qa/contact-gradient-970x912.png`
  - `docs/qa/home-profile-970x912.png`
  - `docs/qa/home-featured-order-970x912.png`
  - `docs/qa/name-card-modal-970x912.png`
  - `docs/qa/property-photo-download-970x912.png`
  - `docs/qa/property-mobile-390x844.png`
- Desktop viewport: 970 × 912 CSS pixels, device scale factor 1.
- Mobile viewport: 390 × 844 CSS pixels, device scale factor 1.
- State: Stable catalogue snapshot 2026.07.27.5, WTL0010 property detail, About, and Contact.

## Full-view comparison evidence

- The existing Catalogue typography, spacing, white/green palette, cards, radii, shadows, navigation, agent panel, and responsive structure were preserved.
- About and Contact retain the original composition while both portrait images now anchor to `50% 0%`; the full hairline is visible and the necessary crop falls at the bottom.
- Setia Alam appears as a sixth service-area chip without changing the existing chip treatment.
- The Contact hero now fades from primary-soft green on the left to white on the right. Its desktop portrait frame is exactly 310 × 335 pixels, matching About Me.
- The homepage portrait uses a 210-pixel column and a 294-pixel frame at this viewport, matching the measured 294-pixel right-hand content block and displaying the full head-to-foot image with `object-fit: contain`.
- The default catalogue order groups Featured listings first, then applies the existing recently-updated ordering within each group.
- Stable publication version 2026.07.27.5 explicitly promotes a case-insensitive `CoverPage` source filename to `cover.webp` and `photos[0]`; the catalogue therefore uses the same intended cover on cards and detail pages.
- The name-card modal contains the complete front-and-back card image within the viewport without horizontal or vertical scrolling.
- Property detail keeps the existing gallery and content hierarchy. The empty Nearby amenities and Why this property cards are absent, so no empty vertical space remains.
- Posting details uses the existing detail-card language and provides a compact primary copy action plus selectable, wrapped posting content.
- The property agent card includes a compact WhatsApp photo-download request action with the code, title, location, and displayed price prefilled.

## Focused comparison evidence

- Gallery: `docs/qa/property-lightbox-970x912.png` confirms a contained full-photo view with visible close, previous, next, and count controls.
- Posting content: `docs/qa/property-posting-970x912.png` confirms readable copy, correct hierarchy, and no overflow.
- Portrait crops: About and Contact captures confirm the top of the hair is no longer clipped.
- Homepage portrait: `docs/qa/home-profile-970x912.png` confirms the larger full-body treatment aligns with the right-hand profile content.
- Homepage ordering: `docs/qa/home-featured-order-970x912.png` confirms Featured cards precede non-Featured cards.
- Name card: `docs/qa/name-card-modal-970x912.png` confirms the complete image is visible without scrollbars.
- Photo request: `docs/qa/property-photo-download-970x912.png` confirms the action is present in the agent card.
- Mobile: `docs/qa/property-mobile-390x844.png` confirms the gallery and detail card remain within the viewport; measured document scroll width does not exceed the client viewport.

## Required fidelity surfaces

- Fonts and typography: unchanged site font family and hierarchy; posting text uses the site font at a compact 12px/1.65 line height.
- Spacing and layout rhythm: existing 16px detail-card rhythm retained; lightbox controls maintain safe edge spacing; mobile copy action stacks to full width.
- Colors and visual tokens: only existing primary, surface, border, text, radius, and shadow tokens are used.
- Image quality and asset fidelity: original sanitized WebP assets are shown with `object-fit: contain` in fullscreen; no replacement or generated imagery is used. Portraits preserve their original asset and aspect treatment.
- Copy and content: Nearby amenities and Why this property are removed. Posting details derives solely from the normalized public listing and public agent profile.

## Interaction verification

- Clicking the main property photo opens the fullscreen dialog.
- Left/Right keyboard navigation changes the active image; Escape closes the dialog.
- Thumbnail selection remains intact.
- Copy posting reaches the visible `Copied` success state.
- The photo-download WhatsApp URL contains the expected WTL0010 code, title, location, and `RM 1,800 / month` price.
- Featured listing order begins WTL0010, WTL0027, WTL0036 before non-Featured WTL0011.
- Name-card image bounds remain within the 970 × 912 viewport and the modal uses hidden overflow rather than scrollbars.
- Nearby amenities and Why this property heading counts are both zero.
- Browser console: zero warnings and zero errors.

## Comparison history

1. Initial source findings: no fullscreen viewer, empty Nearby amenities and Why this property sections, no copyable posting details, Setia Alam omitted, and portrait tops cropped.
2. Fixes: added fullscreen gallery and keyboard controls; removed both empty sections; added public-safe posting copy; added Setia Alam; top-anchored both portrait crops.
3. Follow-up fixes: reversed the Contact gradient, matched its portrait to About Me at 310 × 335, and resized the homepage portrait to align precisely with the adjacent profile content while retaining the full head-to-foot treatment.
4. Post-fix evidence: desktop, mobile, lightbox, posting, homepage, About, and Contact captures above. No remaining P0, P1, or P2 findings.

## Findings

- No actionable P0/P1/P2 differences remain for the requested annotations.

## Follow-up polish

- None required for this scoped pass.

final result: passed
