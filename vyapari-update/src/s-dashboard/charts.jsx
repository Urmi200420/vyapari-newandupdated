import { useState } from "react";
import { formatPrice } from "../data.js";

// round a number up to something tidy for the top of a chart axis
function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const short = (n) => (n >= 100000 ? (n / 100000).toFixed(1) + "L" : n >= 1000 ? Math.round(n / 1000) + "k" : String(n));

/*
  Line + area chart. data = [{ label: "12 Oct", value: 4200 }, ...]
  Hover (or touch) shows the exact value.
*/
export function LineChart({ data, money = true }) {
  const [hover, setHover] = useState(null);
  const W = 800,
    H = 280,
    L = 46,
    R = 14,
    T = 16,
    B = 34;
  if (!data.length) return <p className="dash-note">No data for this period.</p>;

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const x = (i) => L + (data.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (data.length - 1));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const line = data.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.value).toFixed(1)).join(" ");
  const area = line + ` L${x(data.length - 1)} ${H - B} L${x(0)} ${H - B} Z`;
  const step = Math.ceil(data.length / 7);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Line chart"
      >
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3eed4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e3eed4" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="grid-line" />
            <text x={L - 8} y={y(max * t) + 4} className="axis-text" textAnchor="end">
              {money ? "₹" + short(max * t) : short(max * t)}
            </text>
          </g>
        ))}
        {data.map(
          (d, i) =>
            i % step === 0 && (
              <text key={i} x={x(i)} y={H - 10} className="axis-text" textAnchor="middle">
                {d.label}
              </text>
            )
        )}
        <path d={area} fill="url(#area-fill)" />
        <path d={line} className="line" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="hover-line" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" className="hover-dot" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tip glass-panel" style={{ left: (x(hover) / W) * 100 + "%" }}>
          <b>{money ? formatPrice(data[hover].value) : data[hover].value}</b>
          <span>{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

// Vertical bars. data = [{ label, value }]
export function ColumnChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 800,
    H = 220,
    L = 34,
    R = 10,
    T = 14,
    B = 30;
  if (!data.length) return <p className="dash-note">No data for this period.</p>;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const slot = (W - L - R) / data.length;
  const bw = Math.max(3, Math.min(26, slot * 0.62));
  const step = Math.ceil(data.length / 7);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Bar chart">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={T + (1 - t) * (H - T - B)} y2={T + (1 - t) * (H - T - B)} className="grid-line" />
            <text x={L - 8} y={T + (1 - t) * (H - T - B) + 4} className="axis-text" textAnchor="end">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (H - T - B);
          const cx = L + slot * i + slot / 2;
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={cx - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" />
              <rect
                x={cx - bw / 2}
                y={H - B - h}
                width={bw}
                height={Math.max(h, 1)}
                rx="4"
                className={"bar" + (hover === i ? " on" : "")}
              />
              {i % step === 0 && (
                <text x={cx} y={H - 9} className="axis-text" textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="tip glass-panel" style={{ left: ((L + slot * hover + slot / 2) / W) * 100 + "%" }}>
          <b>{data[hover].value} orders</b>
          <span>{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

// Horizontal bars for a ranked list. rows = [{ label, value, text }]
export function HBars({ rows }) {
  if (!rows.length) return <p className="dash-note">Nothing yet.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} className="hbar">
          <div className="hbar-top">
            <span>{r.label}</span>
            <b>{r.text}</b>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: (r.value / max) * 100 + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/*
  Interactive Sales & Revenue Graph with metric selector, area/bar modes,
  rich tooltips, and comparative breakdowns (Gross vs Net Seller Earnings).
*/
export function SalesGraph({ daily = [] }) {
  const [metric, setMetric] = useState("gross"); // "gross" | "net" | "commission" | "orders"
  const [mode, setMode] = useState("area"); // "area" | "bar"
  const [hover, setHover] = useState(null);

  if (!daily || !daily.length) return <p className="dash-note">No sales recorded for this timeframe.</p>;

  const METRICS = {
    gross: {
      label: "Gross Sales",
      icon: "💰",
      unit: "₹",
      color: "#e3eed4",
      getVal: (d) => d.revenue,
      fmt: (v) => formatPrice(v),
    },
    net: {
      label: "Net Earnings (90%)",
      icon: "👛",
      unit: "₹",
      color: "#aec3b0",
      getVal: (d) => Math.round(d.revenue * 0.9),
      fmt: (v) => formatPrice(v),
    },
    commission: {
      label: "Platform Fee (10%)",
      icon: "🏷️",
      unit: "₹",
      color: "#ffb9a8",
      getVal: (d) => Math.round(d.revenue * 0.1),
      fmt: (v) => formatPrice(v),
    },
    orders: {
      label: "Order Volume",
      icon: "📦",
      unit: "",
      color: "#c9dfa6",
      getVal: (d) => d.orders,
      fmt: (v) => v + (v === 1 ? " order" : " orders"),
    },
  };

  const curr = METRICS[metric];
  const series = daily.map((d) => ({
    date: d.date,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: curr.getVal(d),
    revenue: d.revenue,
    net: Math.round(d.revenue * 0.9),
    commission: Math.round(d.revenue * 0.1),
    orders: d.orders,
  }));

  const total = series.reduce((s, r) => s + r.value, 0);
  const avg = Math.round(total / (series.length || 1));
  const peak = series.reduce((m, r) => (r.value > m.value ? r : m), { value: 0, label: "—" });

  const W = 800,
    H = 260,
    L = 50,
    R = 16,
    T = 18,
    B = 34;

  const maxVal = Math.max(...series.map((d) => d.value), 1);
  const max = niceMax(maxVal);

  const x = (i) => L + (series.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (series.length - 1));
  const y = (v) => T + (1 - v / max) * (H - T - B);

  const linePath = series.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.value).toFixed(1)).join(" ");
  const areaPath = linePath + ` L${x(series.length - 1)} ${H - B} L${x(0)} ${H - B} Z`;

  const slot = (W - L - R) / series.length;
  const bw = Math.max(3, Math.min(22, slot * 0.65));
  const step = Math.ceil(series.length / 8);

  const onPointerMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };

  const hItem = hover !== null ? series[hover] : null;

  return (
    <div className="sales-graph-container">
      {/* Top Controls: Metric switches + Chart style toggle */}
      <div className="dash-row between sales-graph-controls">
        <div className="chips">
          {Object.entries(METRICS).map(([k, m]) => (
            <button
              key={k}
              type="button"
              className={"chip" + (metric === k ? " on" : "")}
              onClick={() => setMetric(k)}
            >
              <span className="chip-icon">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        <div className="seg" role="tablist">
          <button
            type="button"
            className={mode === "area" ? "on" : ""}
            onClick={() => setMode("area")}
            title="Continuous trend line"
          >
            📈 Trend
          </button>
          <button
            type="button"
            className={mode === "bar" ? "on" : ""}
            onClick={() => setMode("bar")}
            title="Daily discrete bars"
          >
            📊 Bars
          </button>
        </div>
      </div>

      {/* Mini metric snapshot cards */}
      <div className="sales-graph-snapshot">
        <div className="snapshot-box">
          <span className="snap-label">Period Total</span>
          <strong className="snap-value">{curr.fmt(total)}</strong>
        </div>
        <div className="snapshot-box">
          <span className="snap-label">Daily Average</span>
          <strong className="snap-value">{curr.fmt(avg)}</strong>
        </div>
        <div className="snapshot-box">
          <span className="snap-label">Peak Record</span>
          <strong className="snap-value">{curr.fmt(peak.value)}</strong>
          <span className="snap-sub">{peak.label}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Sales and revenue graph"
        >
          <defs>
            <linearGradient id="sales-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curr.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={curr.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="grid-line" />
              <text x={L - 8} y={y(max * t) + 4} className="axis-text" textAnchor="end">
                {curr.unit ? curr.unit + short(max * t) : short(max * t)}
              </text>
            </g>
          ))}

          {/* X axis date labels */}
          {series.map(
            (d, i) =>
              i % step === 0 && (
                <text key={i} x={mode === "area" ? x(i) : L + slot * i + slot / 2} y={H - 10} className="axis-text" textAnchor="middle">
                  {d.label}
                </text>
              )
          )}

          {/* Render Area/Line mode */}
          {mode === "area" && (
            <>
              <path d={areaPath} fill="url(#sales-area-fill)" />
              <path d={linePath} className="line" style={{ stroke: curr.color }} />
              {hover !== null && (
                <g>
                  <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="hover-line" />
                  <circle cx={x(hover)} cy={y(series[hover].value)} r="6" className="hover-dot" style={{ fill: curr.color }} />
                </g>
              )}
            </>
          )}

          {/* Render Bar mode */}
          {mode === "bar" &&
            series.map((d, i) => {
              const h = (d.value / max) * (H - T - B);
              const cx = L + slot * i + slot / 2;
              return (
                <g key={i} onPointerEnter={() => setHover(i)}>
                  <rect x={cx - slot / 2} y={T} width={slot} height={H - T - B} fill="transparent" />
                  <rect
                    x={cx - bw / 2}
                    y={H - B - h}
                    width={bw}
                    height={Math.max(h, 2)}
                    rx="3"
                    className={"bar" + (hover === i ? " on" : "")}
                    style={{ fill: hover === i ? "#ffffff" : curr.color }}
                  />
                </g>
              );
            })}
        </svg>

        {/* Rich Hover Floating Tooltip */}
        {hItem && (
          <div
            className="tip glass-panel sales-tooltip"
            style={{
              left: Math.max(60, Math.min(W - 140, mode === "area" ? x(hover) : L + slot * hover + slot / 2)) / W * 100 + "%",
            }}
          >
            <div className="tooltip-head">
              <b>{hItem.label}</b>
              <span className="tooltip-metric-val">{curr.fmt(hItem.value)}</span>
            </div>
            <div className="tooltip-details">
              <span>Gross Sales: {formatPrice(hItem.revenue)}</span>
              <span>Net Payout: {formatPrice(hItem.net)}</span>
              <span>10% Admin Fee: {formatPrice(hItem.commission)}</span>
              <span>Orders: {hItem.orders}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}