# Shared catalogue searches

Share search creates a same-origin link at `/s/<id>`. The destination restores
the public filters against the current inventory; it is not an inventory snapshot.
The www alias retains www, Property retains Property, and SCMI retains SCMI.
Shared searches are public: do not enter private or sensitive information in them.

The existing REQUIREMENTS_DB binding stores only the hostname, normalized search,
identifier and creation time. Identical searches on the same hostname reuse a
link. Creation is capped at 1,000 new searches per host per rolling day; existing
links remain usable. Unknown filters and external redirect destinations are rejected.

Before deploying this version, apply only `migrations/0010_shared_search_links.sql`
to the existing shared production database. No new bindings are required.
Run `npm test` for server, client, SQL schema and security regression coverage.
On browsers with native sharing, the first tap prepares the link and the second
opens the share menu with fresh user activation. Other browsers copy the link.
