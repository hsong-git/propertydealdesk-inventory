// Read-only Analytics API exports, verified 24 Oct 2026. Never use these
// aggregate visits to backfill individual event/session attribution.
const end = "2026-10-24T08:46:22.853Z";
const create = (site_host, days, startDay, start, totalVisits, rows) => ({
  site_host, days, totalVisits, rows: rows.map(([source, visits, referrers]) => ({source, visits, referrers})),
  period: {startDay, endDay:"2026-10-24", timezone:"Asia/Kuala_Lumpur", start, end},
  capturedAt:"2026-10-24T08:46:33.792Z", mode:"snapshot", estimated:true, limited:false, excludeBots:true,
  reportUrl:`https://dash.cloudflare.com/3875db6c85889be41a227aec1e74777e/web-analytics/overview/visits?siteTag~in=1714bc0e4faf42ffb77bd003bdb25dac&excludeBots=Yes&host=${site_host}&time-window=${days*1440}`,
});
export const cloudflareReferrerSnapshots = [
  create("property.myeviv.com",7,"2026-10-18","2026-10-17T16:00:00.000Z",398,[
    ["direct_unknown",218,"None (direct): 218"],
    ["facebook",171,"lm.facebook.com: 4; facebook.com: 1; www.facebook.com: 75; l.facebook.com: 5; m.facebook.com: 86"],
    ["authentication_return",6,"dry-dust-2e1c.cloudflareaccess.com: 5; accounts.google.com: 1"],
    ["m.baidu.com",3,"m.baidu.com: 3"],
  ]),
  create("scmi.myeviv.com",7,"2026-10-18","2026-10-17T16:00:00.000Z",69,[
    ["facebook",54,"lm.facebook.com: 1; facebook.com: 2; www.facebook.com: 20; l.facebook.com: 2; m.facebook.com: 29"],
    ["direct_unknown",15,"None (direct): 15"],
  ]),
  create("property.myeviv.com",30,"2026-09-25","2026-09-24T16:00:00.000Z",890,[
    ["direct_unknown",580,"None (direct): 580"],
    ["facebook",310,"www.facebook.com: 130; l.facebook.com: 20; m.facebook.com: 160"],
  ]),
  create("scmi.myeviv.com",30,"2026-09-25","2026-09-24T16:00:00.000Z",150,[
    ["facebook",120,"lm.facebook.com: 10; www.facebook.com: 30; m.facebook.com: 80"],
    ["direct_unknown",30,"None (direct): 30"],
  ]),
  create("property.myeviv.com",90,"2026-07-27","2026-07-26T16:00:00.000Z",2050,[
    ["direct_unknown",1740,"None (direct): 1740"],
    ["facebook",310,"www.facebook.com: 130; l.facebook.com: 20; m.facebook.com: 160"],
  ]),
  create("scmi.myeviv.com",90,"2026-07-27","2026-07-26T16:00:00.000Z",150,[
    ["facebook",120,"lm.facebook.com: 10; www.facebook.com: 30; m.facebook.com: 80"],
    ["direct_unknown",30,"None (direct): 30"],
  ]),
];
