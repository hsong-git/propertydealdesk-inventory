# Automatic traffic source attribution

No tracking-link builder is required or displayed. New browser-tab sessions
capture source before React routing/filter state changes the arrival URL.
Priority: existing utm_source/src labels, browser web/app referrer, classified
landing-request Referer fallback, then Direct / unknown. First touch remains
fixed for the tab session and follows listing views, WhatsApp clicks and inquiries.

Recognised sources include Facebook, Google search, Bing, Instagram, WhatsApp
Web, Telegram and supplied Android app referrers. Recognition does not make
an app supply a referrer: ordinary WhatsApp clicks can still be unknown. No
phone number, group identity, fingerprint, full referrer URL, query or click ID
is recorded by this feature. Authentication returns (Cloudflare Access/Google
sign-in) are labelled separately, not credited as search traffic.

The edge fallback injects only classified source/medium labels into public HTML,
including short-link HTML. Such responses use private/no-store caching, and
remove ETag/Content-Length, preventing cross-visitor attribution cache leaks.
Blank/internal/HEAD/API/error responses are not transformed. This supplements
browser evidence; it cannot recover a header that was never supplied.

The dashboard shows source evidence coverage (observed referrers versus link
labels), source-specific views, WhatsApp clicks, inquiries and conversion rates.
Existing generic shared-link/campaign labels remain supported, but are not
presented as proof of which app was used. Historical blank sources are not guessed.

## Existing Cloudflare data

The simplified source card shows one dataset: Cloudflare visit shares when
available, otherwise website tab-session shares. Each source has one bar, one
percentage and its count. No raw counts are combined. A visible snapshot date
distinguishes stored Cloudflare reports from live data. Website WhatsApp clicks
and inquiries are separate summary figures, not attributed to Cloudflare sources.
Technical notes, raw referrers and the original website conversion table stay
under a closed-by-default More details disclosure. Unknown/unrecorded groups
legacy blanks with direct/unknown in the website fallback, without guessing an app.

On 24 October 2026, authenticated Cloudflare Web Analytics showed, for the
Property hostname only, Last 30 days (Malaysia time), Exclude bots = Yes:

| Referrer | Cloudflare visits (estimated) |
| --- | ---: |
| None (direct) | 580 |
| m.facebook.com | 160 |
| www.facebook.com | 130 |
| l.facebook.com | 20 |
| Total | 890 |

The separately labelled dashboard snapshot groups Facebook as 310 (34.8%),
and direct/unknown as 580 (65.2%). Cloudflare values may be sampled/estimated.
Read-only API snapshots now cover both Property and SCMI for 7/30/90 calendar
days, using the same Malaysia-day boundaries as the dashboard, through
24 October 2026 at 16:46 MYT. They follow the site/period selector but stay
clearly dated after that day. They can include administration traffic.
Do not merge Cloudflare visits with tab sessions or assign aggregate
referrals to historical leads. No WhatsApp referrer in this snapshot does not
mean no WhatsApp visitors.

An expired legacy CLI configuration initially failed, but the active CLI
session successfully retrieved the API reports. No tokens or permissions were
created or expanded. scripts/read-cloudflare-sources.mjs prints a read-only,
credential-free export of all six reports for future snapshot updates.

The authenticated /api/admin/cloudflare-sources endpoint supports a separately
provisioned CF_ANALYTICS_READ_TOKEN binding for live reports, with an 8-second
timeout per request and dated-snapshot fallback on error. The binding has not
been configured: never copy a broad CLI OAuth credential into the deployment.
Live synchronisation needs separately authorised account-scoped, read-only
Analytics API access. Snapshot data stays in authenticated APIs, not public
frontend assets. A hostname-filtered Cloudflare link also opens the live report.
90-day reads use non-overlapping 30-day slices and sum visits, not pageviews.

Run npm run test:analytics, npm test, npm run test:seo and both guarded builds.
No database migration is required. Preserve SCMI build-mode deployment guards.
