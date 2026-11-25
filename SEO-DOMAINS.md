# Preferred public domain

The preferred public catalogue is https://www.myeviv.com.

- `scmi.myeviv.com` permanently redirects (308) to the same path and query on WWW.
- The existing SCMI Pages project serves WWW; its internal build mode/project name remains `scmi` to avoid creating or retargeting infrastructure.
- Property remains usable at `property.myeviv.com`. Shared home, inquiry and listing pages identify their equivalent WWW URL with `rel=canonical`; they are not redirected.
- Property's SMI-only pagination differs from WWW's combined pagination. It remains crawlable with `noindex, follow`, keeps its own canonical, and is omitted from the Property sitemap.
- Both sitemap files contain only preferred WWW URLs. Robots files point to the complete WWW sitemap. WWW's sitemap includes the combined public catalogue and pagination.
- Old SCMI `/s/` links resolve on WWW using an explicit legacy-host lookup. Property links remain isolated. No existing database records need changing.
- New public property shares use WWW. Explicit Property enquiry/search links can still use their visited domain.
- Analytics records each actual hostname. WWW and SCMI (legacy) remain separate reporting choices; past events are not rewritten.
- Private administration, download grants and Property's unlisted CMI routes retain noindex protections. No private data is made indexable by this migration.
- Search titles/descriptions are generated consistently for initial HTML and browser rendering. Long social-post summaries remain separate from search descriptions; the wide name-card asset is unchanged.

## Release checks

Run the regression, SEO, analytics and deployment tests; build/deploy the WWW/SCMI project and Property project separately. Check canonical URLs, redirects, crawler-visible details, noindex pages, both inventories, mobile rendering, and old/new search links. Never deploy the opposite catalogue's build output.

## After release

Verify the `myeviv.com` Domain property in Google Search Console, submit https://www.myeviv.com/sitemap.xml, and inspect representative WWW and legacy URLs. Google-selected canonicals, indexing, rankings and Core Web Vitals require separate real-world monitoring; metadata changes cannot guarantee them. Do not use robots.txt to block duplicate pages before Google can read their canonicals.

## Discovery improvements

- Three curated area destinations: `/areas/bukit-tinggi`, `/areas/bandar-botanic`, and `/areas/setia-alam`. Counts, asking-price ranges and property types come from the same published inventory and location dictionary as the catalogue. A dual-intent unit counts once overall and once in each applicable offer summary. Missing prices are not treated as zero-price offers or market valuations.
- Only areas with listings are emitted and added to the sitemap. The manifest whitelist returns 404 for unknown/empty area routes. Property's area content excludes its unlisted CMI records; WWW includes the approved combined catalogue.
- Area pages contain real listing links, enquiry/contact actions, comparison guidance, CollectionPage/ItemList and breadcrumb markup. Navigation is present in initial HTML and in the interactive site, without creating pages for arbitrary filter combinations.
- About and Contact pages are restored with the supplied professional identity, REN number, agency, phone and email. No office address, review score, awards, market valuations or neighbourhood travel times are invented.
- Non-home routes are split into on-demand JavaScript chunks. The catalogue does not download form or administration page code initially. A page-load boundary presents a reload option if a chunk cannot be loaded.
- New tests cover price summaries, location matching, CMI exclusion, safe HTML/JSON-LD output and published-area routing. Release QA must also exercise all lazy routes, enquiry language/Room behaviour, native/desktop sharing, and new-page navigation on mobile.

### Search Console setup still requires the owner's Google account

1. Sign in at https://search.google.com/search-console and check whether a `myeviv.com` Domain property already exists.
2. If not, add the Domain property `myeviv.com` (without HTTPS or WWW) and use Google's provided DNS verification record. Do not fabricate a verification token or share account passwords.
3. Verify ownership, submit `https://www.myeviv.com/sitemap.xml`, and inspect the WWW homepage, an area page, a listing and a legacy SCMI URL after publication.
4. Review indexing exclusions, Google's selected canonicals, search queries and real-user Core Web Vitals. Top ranking is not guaranteed, and public-page checks alone cannot verify these account-only reports.
