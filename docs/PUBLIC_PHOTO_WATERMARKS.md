# Public property photo watermarks

The Inventory Catalogue displays a professional watermark on public property photos.

Watermark text:

```text
TRR HS Ong
property.myeviv.com
```

## Browser overlay mode

The current catalogue default is browser overlay mode. The centralized config lives in:

```text
src/config/watermark.js
```

Supported modes:

- `overlay` — render the browser overlay on public property photos.
- `embedded` — treat the published images as already watermarked and automatically suppress the browser overlay.
- `disabled` — render no watermark.

The browser overlay is one centered two-line group of solid white text with no shadow. The first line, `TRR HS Ong`, is larger than the URL line. It is kept subtle through opacity, is decorative, and uses `aria-hidden="true"`. It never replaces image `alt` text and has `pointer-events: none`, so it should not block gallery clicks, swipe/click controls, lightbox navigation or thumbnails.

## Included and excluded images

The overlay applies only through `PublicPropertyImage`, which is used for public listing photos:

- property card cover images;
- property detail main gallery images;
- gallery thumbnails;
- fullscreen gallery images.

The overlay is intentionally excluded from:

- agent portrait/profile photos;
- About and Contact profile images;
- name card images;
- QR placeholders or future QR images;
- website/agency logos;
- icons, placeholders and decorative backgrounds.

## Important limitation

The browser overlay is a deterrent only. Any image delivered to a public browser can still be copied through screenshots, developer tools, cache inspection or network requests. It should not be treated as theft prevention or access control.

## Future embedded watermark workflow

The production-safe long-term workflow should embed the same watermark into the optimized publication images generated from Production Stable before they are copied into:

```text
public/inventory/<SMI_CODE>/
```

Stable should never modify original/master PropertyDealDesk photos. It should generate sanitized, optimized, embedded-watermarked publication copies only.

When embedded watermarks are available, set the catalogue config mode to `embedded`. That prevents duplicate browser overlays while keeping the UI code path unchanged.

Future downloadable photo packages, shared catalogue images and any static publication image outputs should use embedded-watermarked public copies, never original PropertyDealDesk master photos.
