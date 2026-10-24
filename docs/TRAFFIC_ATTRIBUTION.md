# Traffic source attribution

New browser-tab sessions capture attribution before React routing or catalogue
filters rewrite the entry URL. Priority: `utm_source`, then `src`, then external
referrer hostname, then `direct_unknown`. Source, medium, campaign and content
remain fixed for that tab session. No full referring URL, search term, click ID,
IP address or contact detail is captured by this attribution feature.

Recognised referrers include Google, Bing, DuckDuckGo, Yahoo, Facebook,
Instagram, TikTok, LinkedIn and X. Other external referring domains are shown
as domains. Internal Property/SCMI links do not create external referral credit.
WhatsApp and other applications may supply no referrer: use a tagged link.

In Administration → Traffic analytics, use **Create a tracked link**. Select a
source, enter a campaign label and optionally a group/post placement label.
Use labels such as `october_rentals` / `klang_agents_group`, without personal
names or contact details. The builder accepts public Property/SCMI homepage
and listing URLs, preserving existing preview and filter parameters.

The Share property and Share search actions automatically generate generic
shared-link attribution. They do not guess which app the native share sheet
will use. Ordinary copied posting text keeps its existing clean listing link.
Use the builder when platform/group-specific attribution is needed.

The source report includes all recorded sessions, including listing-only
arrivals, with detail views, WhatsApp clicks, inquiry submissions and the
inquiry/session rate. Each session is grouped once under its first known source.
For old sessions with blanks and a later source tag, that first known source
is used. Campaigns are grouped by source, medium, campaign and content.
The reporting change may increase source session totals because the old table
counted only sessions with a `catalogue_view` event.

Historical blanks remain **Unattributed (historical)**. No source is inferred
retroactively. New sessions without evidence use **Direct / unknown**. A tag
describes a link's intended distribution, not a verified originating app:
forwarding a link also forwards its campaign attribution.

Metadata is stored under reserved `traffic_*` keys in existing event JSON;
no database migration is needed. Run `npm run test:analytics` for parser,
aggregation, period, campaign and conversion tests. Deploy using the guarded
catalogue-specific commands documented in `SCMI-DEPLOYMENT.md`.
