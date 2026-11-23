import { useMemo, useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { dailySeries, money, sumRows, bucketize, pendingSettlements, change, PERIODS } from "../data/finance.js";
import { COMMISSION_RATE, COURIER_RATE, SETTLEMENT_DAYS } from "../data/seed.js";
import { HBars } from "../../s-dashboard/charts.jsx";
import { Title, Seg, StatCard, rupees, compactRupees, num, pctNote } from "../ui.jsx";

const pct = Math.round(COMMISSION_RATE * 100);
const METRICS = {
  platformNet: { label: "Net platform earnings", icon: "🏦", color: "#e3eed4", money: true },
  commission: { label: "Platform commission", icon: "🏷️", color: "#c9dfa6", money: true },
  gross: { label: "Gross sales", icon: "💰", color: "#aec3b0", money: true },
  orders: { label: "Transactions", icon: "🧾", color: "#e8c98a", money: false },
};

export default function AdminAnalytics() {
  const { db } = useAdmin();
  const series = useMemo(() => dailySeries(db), [db]);
  const all = useMemo(() => money(sumRows(series)), [series]);
  const last30 = money(sumRows(series.slice(-30)));
  const prev30 = money(sumRows(series.slice(-60, -30)));
  const settle = pendingSettlements(db);
  const note = (a, b) => pctNote(change(a, b), "last 30 days vs previous 30");

  const cards = [
    { icon: "💰", label: "Total gross sales", value: compactRupees(all.gross), ...asNote(note(last30.gross, prev30.gross)), spark: series.slice(-30).map((r) => r.gross) },
    { icon: "🏷️", label: "Total platform commission", value: compactRupees(all.commission), note: pct + "% of net sales (" + compactRupees(all.netSales) + ")" },
    { icon: "🏦", label: "Net platform earnings", value: compactRupees(all.platformNet), ...asNote(note(last30.platformNet, prev30.platformNet)), spark: series.slice(-30).map((r) => money(r).platformNet) },
    { icon: "🧾", label: "Total transactions", value: num(all.orders), note: num(all.delivered) + " delivered · " + num(all.cancelled) + " cancelled" },
    { icon: "⏳", label: "Pending settlements", value: compactRupees(settle.total), note: "Owed to sellers for " + settle.count + " orders (T+" + SETTLEMENT_DAYS + ")", tone: "down" },
    { icon: "↩️", label: "Total refund amount", value: compactRupees(all.refunds), note: ((all.refunds / Math.max(1, all.gross)) * 100).toFixed(1) + "% of gross sales", tone: "down" },
  ];

  return (
    <div className="dash-stack ad-stack">
      <div className="dash-row between">
        <p className="dash-note left">Platform-wide figures across every seller. Commission is {pct}% of sales after refunds; couriers are paid ₹{COURIER_RATE} per delivered order.</p>
      </div>
      <div className="ad-stat-grid six">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <section className="panel sales-graph-panel">
        <EarningsGraph series={series} />
      </section>

      <Breakdown series={series} />

      <div className="two-col">
        <TopSellers />
        <ByCategory />
      </div>
    </div>
  );
}
const asNote = (n) => ({ note: n.text, tone: n.tone });

/* ---------------- earnings graph ---------------- */
function niceMax(v) {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const axis = (n, isMoney) => (isMoney ? compactRupees(n).replace(".0", "").replace(".00", "") : n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "k" : String(Math.round(n)));

function EarningsGraph({ series }) {
  const [period, setPeriod] = useState("daily");
  const [metric, setMetric] = useState("platformNet");
  const [mode, setMode] = useState("area");
  const [hover, setHover] = useState(null);
  const data = useMemo(() => bucketize(series, period), [series, period]);
  const m = METRICS[metric];
  const fmt = (v) => (m.money ? rupees(v) : num(v) + " orders");
  const vals = data.map((d) => d[metric]);
  const total = vals.reduce((s, v) => s + v, 0);
  const peakI = vals.indexOf(Math.max(...vals));
  const first = vals[0];
  const last = vals[vals.length - 1];
  const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[period];

  const W = 800, H = 280, L = 62, R = 16, T = 18, B = 34;
  const lo = Math.min(0, ...vals);
  const max = niceMax(Math.max(...vals, 1));
  const span = max - lo || 1;
  const x = (i) => L + (data.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (data.length - 1));
  const y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
  const slot = (W - L - R) / data.length;
  const bw = Math.max(4, Math.min(38, slot * 0.62));
  const cx = (i) => (mode === "area" ? x(i) : L + slot * i + slot / 2);
  const line = data.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d[metric]).toFixed(1)).join(" ");
  const area = line + ` L${x(data.length - 1)} ${y(lo)} L${x(0)} ${y(lo)} Z`;
  const step = Math.ceil(data.length / 8);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = mode === "area" ? Math.round(((px - L) / (W - L - R)) * (data.length - 1)) : Math.floor((px - L) / slot);
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover !== null ? data[hover] : null;
  const growth = change(last, first);

  return (
    <>
      <div className="dash-row between">
        <h2 className="stack-title small">
          <em>How the platform earns over time</em>
          <strong>Admin earnings graph</strong>
        </h2>
        <Seg
          label="Time period"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setHover(null);
            if (p === "yearly") setMode("bar");
          }}
          options={Object.entries(PERIODS).map(([id, p]) => ({ id, label: p.label }))}
        />
      </div>
      <div className="sales-graph-container">
        <div className="dash-row between sales-graph-controls">
          <div className="chips">
            {Object.entries(METRICS).map(([k, x]) => (
              <button key={k} type="button" className={"chip" + (metric === k ? " on" : "")} onClick={() => setMetric(k)}>
                {x.icon} {x.label}
              </button>
            ))}
          </div>
          <div className="seg" role="tablist" aria-label="Chart style">
            <button type="button" className={mode === "area" ? "on" : ""} onClick={() => setMode("area")}>
              📈 Trend
            </button>
            <button type="button" className={mode === "bar" ? "on" : ""} onClick={() => setMode("bar")}>
              📊 Bars
            </button>
          </div>
        </div>

        <div className="sales-graph-snapshot">
          <div className="snapshot-box">
            <span className="snap-label">Total · {PERIODS[period].note}</span>
            <strong className="snap-value">{m.money ? compactRupees(total) : num(total)}</strong>
          </div>
          <div className="snapshot-box">
            <span className="snap-label">Average per {unit}</span>
            <strong className="snap-value">{fmt(Math.round(total / Math.max(1, data.length)))}</strong>
          </div>
          <div className="snapshot-box">
            <span className="snap-label">Best {unit}</span>
            <strong className="snap-value">{fmt(vals[peakI] || 0)}</strong>
            <span className="snap-sub">{data[peakI]?.sub}</span>
          </div>
          <div className="snapshot-box">
            <span className="snap-label">First → latest {unit}</span>
            <strong className={"snap-value " + (growth === null ? "" : growth >= 0 ? "pos" : "neg")}>{growth === null ? "—" : (growth >= 0 ? "▲ " : "▼ ") + Math.abs(growth).toFixed(0) + "%"}</strong>
            <span className="snap-sub">{period === "yearly" || period === "monthly" ? "latest " + unit + " is still in progress" : "across the chart"}</span>
          </div>
        </div>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={m.label + " by " + unit}>
            <defs>
              <linearGradient id="ad-earn-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity="0.42" />
                <stop offset="100%" stopColor={m.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const v = lo + span * t;
              return (
                <g key={t}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid-line" />
                  <text x={L - 8} y={y(v) + 4} className="axis-text" textAnchor="end">
                    {axis(v, m.money)}
                  </text>
                </g>
              );
            })}
            {data.map(
              (d, i) =>
                (i % step === 0 || i === data.length - 1) && (data.length - 1 - i >= step / 2 || i === data.length - 1) && (
                  <text key={d.key} x={cx(i)} y={H - 10} className="axis-text" textAnchor="middle">
                    {d.label}
                  </text>
                )
            )}
            {mode === "area" ? (
              <>
                <path d={area} fill="url(#ad-earn-fill)" />
                <path d={line} className="line" style={{ stroke: m.color }} />
                {data.length <= 14 && data.map((d, i) => <circle key={d.key} cx={x(i)} cy={y(d[metric])} r="3.5" className="ad-point" style={{ fill: m.color }} />)}
                {h && (
                  <g>
                    <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="hover-line" />
                    <circle cx={x(hover)} cy={y(h[metric])} r="6" className="hover-dot" style={{ fill: m.color }} />
                  </g>
                )}
              </>
            ) : (
              data.map((d, i) => {
                const v = d[metric];
                const top = y(Math.max(v, 0));
                const ht = Math.abs(y(v) - y(0));
                return (
                  <g key={d.key}>
                    <rect x={L + slot * i + slot / 2 - bw / 2} y={top} width={bw} height={Math.max(ht, 2)} rx="4" className={"bar" + (hover === i ? " on" : "")} style={{ fill: hover === i ? "#ffffff" : m.color }} />
                  </g>
                );
              })
            )}
          </svg>
          {h && (
            <div className="tip glass-panel sales-tooltip" style={{ left: (Math.max(110, Math.min(W - 110, cx(hover))) / W) * 100 + "%" }}>
              <div className="tooltip-head">
                <b>{h.sub}</b>
                <span className="tooltip-metric-val">{fmt(h[metric])}</span>
              </div>
              <div className="tooltip-details">
                <span>Gross sales: {rupees(h.gross)}</span>
                <span>Refunds: {rupees(h.refunds)}</span>
                <span>Commission ({pct}%): {rupees(h.commission)}</span>
                <span>Courier payouts: {rupees(h.courierPayouts)}</span>
                <span>Net platform earnings: {rupees(h.platformNet)}</span>
                <span>Transactions: {num(h.orders)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- revenue breakdown ---------------- */
const SCOPES = [
  { id: "30", label: "Last 30 days" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];
function Breakdown({ series }) {
  const [scope, setScope] = useState("30");
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const rows = scope === "30" ? series.slice(-30) : scope === "year" ? series.filter((r) => r.t >= yearStart) : series;
  const b = money(sumRows(rows));
  const share = (v) => (b.gross ? (v / b.gross) * 100 : 0);
  const lines = [
    { label: "Total sales value", value: b.gross, cls: "total", hint: num(b.orders - b.cancelled) + " paid orders" },
    { label: "Refunds", value: -b.refunds, cls: "minus", hint: "Approved returns & refunds" },
    { label: "Net sales", value: b.netSales, cls: "sub", hint: "Sales value after refunds" },
    { label: "Seller earnings", value: b.sellerEarnings, cls: "out", hint: 100 - pct + "% of net sales, paid out to sellers" },
    { label: "Platform commission", value: b.commission, cls: "plus", hint: pct + "% of net sales" },
    { label: "Courier payouts", value: -b.courierPayouts, cls: "minus", hint: "₹" + COURIER_RATE + " × " + num(b.delivered) + " delivered orders" },
    { label: "Net platform revenue", value: b.platformNet, cls: "final", hint: "Commission minus courier payouts" },
  ];
  return (
    <section className="panel">
      <Title em="Where every rupee goes" strong="Revenue breakdown">
        <Seg label="Breakdown period" value={scope} onChange={setScope} options={SCOPES} />
      </Title>
      <div className="ad-split-bar" role="img" aria-label="Share of total sales value">
        <span className="ad-sp-seller" style={{ flex: Math.max(0.0001, b.sellerEarnings) }} title={"Seller earnings " + share(b.sellerEarnings).toFixed(1) + "%"} />
        <span className="ad-sp-platform" style={{ flex: Math.max(0.0001, b.platformNet) }} title={"Net platform revenue " + share(b.platformNet).toFixed(1) + "%"} />
        <span className="ad-sp-courier" style={{ flex: Math.max(0.0001, b.courierPayouts) }} title={"Courier payouts " + share(b.courierPayouts).toFixed(1) + "%"} />
        <span className="ad-sp-refund" style={{ flex: Math.max(0.0001, b.refunds) }} title={"Refunds " + share(b.refunds).toFixed(1) + "%"} />
      </div>
      <div className="ad-split-legend">
        <span><i className="ad-sp-seller" /> Seller earnings {share(b.sellerEarnings).toFixed(1)}%</span>
        <span><i className="ad-sp-platform" /> Net platform revenue {share(b.platformNet).toFixed(1)}%</span>
        <span><i className="ad-sp-courier" /> Courier payouts {share(b.courierPayouts).toFixed(1)}%</span>
        <span><i className="ad-sp-refund" /> Refunds {share(b.refunds).toFixed(1)}%</span>
      </div>
      <div className="ad-waterfall">
        {lines.map((l) => (
          <div key={l.label} className={"ad-wf-row " + l.cls}>
            <div>
              <b>{l.label}</b>
              <span>{l.hint}</span>
            </div>
            <strong>{(l.value < 0 ? "− " : "") + rupees(Math.abs(l.value))}</strong>
          </div>
        ))}
      </div>
      <p className="dash-note left ad-small">Check: seller earnings + platform commission = net sales ({rupees(b.sellerEarnings)} + {rupees(b.commission)} = {rupees(b.netSales)}).</p>
    </section>
  );
}

function TopSellers() {
  const { db } = useAdmin();
  const map = new Map();
  for (const o of db.orders) if (o.status !== "CANCELLED") map.set(o.sellerName, (map.get(o.sellerName) || 0) + o.amount);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  return (
    <section className="panel">
      <Title em="Last 45 days" strong="Top sellers by sales" />
      <HBars rows={rows.map(([label, v]) => ({ label, value: v, text: rupees(v) + " · " + rupees(Math.round(v * COMMISSION_RATE)) + " fee" }))} />
    </section>
  );
}

function ByCategory() {
  const { db } = useAdmin();
  const map = new Map();
  for (const o of db.orders) if (o.status !== "CANCELLED") for (const i of o.items) map.set(i.category, (map.get(i.category) || 0) + i.qty * i.price);
  const name = (id) => {
    const c = db.categories.find((x) => x.id === id);
    return c ? c.icon + " " + c.name : id;
  };
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const methods = ["UPI", "Card", "COD"].map((m) => [m, db.orders.filter((o) => o.method === m && o.status !== "CANCELLED").length]);
  const total = methods.reduce((s, [, n]) => s + n, 0) || 1;
  return (
    <section className="panel">
      <Title em="Last 45 days" strong="Sales by category" />
      <HBars rows={rows.map(([id, v]) => ({ label: name(id), value: v, text: compactRupees(v) }))} />
      <h3 className="ad-sub-head">Payment methods</h3>
      <div className="ad-method-row">
        {methods.map(([mth, n]) => (
          <div key={mth}>
            <b>{Math.round((n / total) * 100)}%</b>
            <span>{mth === "COD" ? "Cash on delivery" : mth}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
