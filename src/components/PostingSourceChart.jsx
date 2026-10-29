import { useEffect, useRef, useState } from "react";

const SERIES = [
  { key: "sessions", label: "Sessions", color: "#0057B8" },
  { key: "listing_views", label: "Listing views", color: "#C84B00", dash: "8 6" },
  { key: "whatsapp_clicks", label: "WhatsApp clicks", color: "#007A3D", dash: "2 4" },
  { key: "inquiries", label: "Inquiries", color: "#8A2BE2", dash: "9 3 2 3" },
];
const shortDate = day => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {day:"numeric",month:"short",timeZone:"UTC"});

export function PostingSourceChart({ title, points }) {
  const container = useRef(null);
  const [width, setWidth] = useState(320);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(180, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setSelected(null), [points]);
  const height = 210, left = 38, right = 12, top = 12, bottom = 30;
  const ceiling = Math.ceil(Math.max(2, ...points.flatMap(p => SERIES.map(s => p[s.key]))) / 2) * 2;
  const x = i => left + i / Math.max(1, points.length - 1) * (width - left - right);
  const y = value => top + (1 - value / ceiling) * (height - top - bottom);
  const active = points[selected ?? points.length - 1];
  const selectAt = event => {
    const box = event.currentTarget.getBoundingClientRect();
    setSelected(Math.max(0, Math.min(points.length - 1, Math.round((event.clientX - box.left - left) / (width - left - right) * (points.length - 1)))));
  };
  const hasActivity = points.some(p => SERIES.some(s => p[s.key] > 0));
  return <section className="analytics-trend-chart analytics-posting-chart" ref={container} aria-label={`${title} daily progress`}>
    <h3>{title}</h3>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: sessions, listing views, WhatsApp clicks and inquiries per day`} onPointerMove={selectAt} onPointerDown={selectAt} onPointerLeave={() => setSelected(null)}>
      <title>{title} daily progress</title>
      {[0, ceiling / 2, ceiling].map(value => <g key={value}><line className="analytics-chart-gridline" x1={left} x2={width-right} y1={y(value)} y2={y(value)} /><text x={left-7} y={y(value)+4} textAnchor="end">{value}</text></g>)}
      {SERIES.map(s => <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} points={points.map((p,i)=>`${x(i)},${y(p[s.key])}`).join(" ")}><title>{s.label}</title></polyline>)}
      {[0, Math.floor((points.length-1)/2), points.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>points[i] ? <text key={i} x={x(i)} y={height-6} textAnchor={i===0?"start":i===points.length-1?"end":"middle"}>{shortDate(points[i].day)}</text> : null)}
      {selected !== null && active ? <g><line className="analytics-chart-guide" x1={x(selected)} x2={x(selected)} y1={top} y2={height-bottom}/>{SERIES.map(s=><circle key={s.key} cx={x(selected)} cy={y(active[s.key])} r="4" fill={s.color}/>)}</g> : null}
    </svg>
    {!hasActivity ? <p className="analytics-table-note">No tracked activity in this period.</p> : null}
    {active ? <>
      <label className="analytics-posting-date">Date <select aria-label={`${title}: inspect date`} value={active.day} onChange={e=>setSelected(points.findIndex(p=>p.day===e.target.value))}>{points.map(p=><option key={p.day} value={p.day}>{shortDate(p.day)}</option>)}</select></label>
      <dl className="analytics-posting-legend">{SERIES.map(s=><div key={s.key}><dt><svg width="22" height="8" aria-hidden="true"><line x1="0" x2="22" y1="4" y2="4" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash}/></svg>{s.label}</dt><dd>{active[s.key]}</dd></div>)}</dl>
    </> : null}
  </section>;
}
