const LABELS = { direct_unknown: "Direct / unknown", unattributed: "Unattributed (historical)", Unattributed: "Unattributed (historical)", catalogue_share: "Shared listing link", catalogue_search: "Shared search link", google: "Google", bing: "Bing", facebook: "Facebook", instagram: "Instagram", whatsapp: "WhatsApp", telegram: "Telegram", email: "Email", duckduckgo: "DuckDuckGo", yahoo: "Yahoo", linkedin: "LinkedIn", tiktok: "TikTok", x: "X" };
export const trafficSourceLabel = (value) => LABELS[value] || value;

export function TrafficSourcesReport({ sources, campaigns }) {
  const rate = (row) => Number(row.sessions) ? `${(Number(row.inquiries || 0) / Number(row.sessions) * 100).toFixed(1)}%` : "0.0%";
  const columns = (row) => <><td>{row.sessions}</td><td>{row.listing_views || 0}</td><td>{row.whatsapp_clicks || 0}</td><td>{row.inquiries || 0}</td><td>{rate(row)}</td></>;
  return <section className="analytics-card analytics-sources-card">
    <h2>Traffic sources and leads</h2>
    <p className="analytics-table-note">All recorded sessions, including direct listing arrivals. Each session uses its first recorded source.</p>
    <div className="analytics-source-table-wrap"><table><thead><tr><th>Source</th><th>Sessions</th><th>Views</th><th>WhatsApp clicks</th><th>Inquiries</th><th>Inquiry/session</th></tr></thead><tbody>{sources.map((row) => <tr key={row.source}><td>{trafficSourceLabel(row.source)}</td>{columns(row)}</tr>)}</tbody></table></div>
    {!sources.length ? <p className="analytics-table-note">No recorded sessions in this period.</p> : null}
    <h3>Campaigns</h3>
    <div className="analytics-source-table-wrap"><table><thead><tr><th>Campaign</th><th>Source / medium</th><th>Sessions</th><th>Views</th><th>WhatsApp clicks</th><th>Inquiries</th><th>Inquiry/session</th></tr></thead><tbody>{campaigns.map((row) => <tr key={JSON.stringify([row.source, row.medium, row.campaign, row.content])}><td>{row.campaign}{row.content ? <small className="analytics-source-content">{row.content}</small> : null}</td><td>{trafficSourceLabel(row.source)} / {row.medium || "—"}</td>{columns(row)}</tr>)}</tbody></table></div>
    {!campaigns.length ? <p className="analytics-table-note">Campaign results appear after visitors use tagged links.</p> : null}
    <p className="analytics-table-note">Referrers identify websites when supplied by the browser. Tagged links identify their intended distribution; forwarded links keep that tag. Direct / unknown has no identifiable source. Historical unattributed visits cannot be recovered.</p>
  </section>;
}
