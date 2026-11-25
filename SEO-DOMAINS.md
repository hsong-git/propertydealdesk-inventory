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
