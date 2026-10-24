import { useEffect, useRef, useState } from "react";

export function AnalyticsTrendChart({ title, metric, points, percent = false }) {
  const container = useRef(null);
  const [width, setWidth] = useState(320);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setSelected(null); }, [points]);
  const height = 190, left = 48, right = 12, top = 12, bottom = 32;
  const max = Math.max(percent ? 1 : 2, ...points.map((point) => point[metric]));
  const ceiling = percent ? Math.ceil(max * 10) / 10 : Math.ceil(max / 2) * 2;
  const x = (index) => left + index / Math.max(1, points.length - 1) * (width - left - right);
  const y = (value) => top + (1 - value / ceiling) * (height - top - bottom);
  const format = (value) => percent ? `${value.toFixed(1)}%` : value.toLocaleString();
  const date = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const active = points[selected ?? points.length - 1];
  const selectAt = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    setSelected(Math.max(0, Math.min(points.length - 1, Math.round(((event.clientX - box.left) / box.width * width - left) / (width - left - right) * (points.length - 1)))));
  };
  return <section className="analytics-trend-chart" ref={container}>
    <h3>{title}</h3>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} per day`} onPointerMove={selectAt} onPointerDown={selectAt} onPointerLeave={() => setSelected(null)}>
      <title>{title} per day</title>
      {[0, ceiling / 2, ceiling].map((value) => <g key={value}><line className="analytics-chart-gridline" x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 7} y={y(value) + 4} textAnchor="end">{format(value)}</text></g>)}
      <polyline className="analytics-chart-line" points={points.map((point, index) => `${x(index)},${y(point[metric])}`).join(" ")} />
      {points.map((point, index) => point[metric] > 0 ? <circle key={point.day} className="analytics-chart-dot" cx={x(index)} cy={y(point[metric])} r="3"><title>{date(point.day)}: {format(point[metric])}</title></circle> : null)}
      {[0, Math.floor((points.length - 1) / 2), points.length - 1].filter((value, index, values) => values.indexOf(value) === index).map((index) => points[index] ? <text key={index} x={x(index)} y={height - 8} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}>{date(points[index].day)}</text> : null)}
      {selected !== null && active ? <g><line className="analytics-chart-guide" x1={x(selected)} x2={x(selected)} y1={top} y2={height - bottom} /><circle className="analytics-chart-dot" cx={x(selected)} cy={y(active[metric])} r="5" /></g> : null}
    </svg>
    {active ? <div className="analytics-chart-detail"><label>Date <select aria-label={`${title}: inspect date`} value={active.day} onChange={(event) => setSelected(points.findIndex((point) => point.day === event.target.value))}>{points.map((point) => <option key={point.day} value={point.day}>{date(point.day)}</option>)}</select></label><strong>{format(active[metric])}</strong></div> : <p>No daily data available.</p>}
  </section>;
}
