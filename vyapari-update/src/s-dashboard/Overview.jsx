import { useState } from "react";
import { getStats, getItems } from "../api";
import { categories, formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import { LineChart, ColumnChart, HBars, SalesGraph } from "./charts.jsx";
import { useAsync, Loading, ErrorNote, isLow, LOW_STOCK_BELOW } from "./parts.jsx";

const catLabel = (id) => categories.find((c) => c.id === id)?.label || id;
const dayLabel = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);

const RANGES = [
  { days: 7, label: "This week", note: "last 7 days" },
  { days: 30, label: "This month", note: "last 30 days" },
  { days: 0, label: "All time", note: "since you joined" },
];

export default function Overview({ goTo }) {
  const [days, setDays] = useState(30);
  const range = RANGES.find((r) => r.days === days);

  // the chosen period, plus double that (to compare with the period before). All time has no "before".
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([getStats(days), days ? getStats(days * 2) : null, getItems()]).then(([now, wide, items]) => ({ now, wide, items })),
    [days]
  );

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading store performance..." />;

  const { now, wide, items } = data;
  const prev = wide ? wide.daily.slice(0, Math.max(0, wide.daily.length - now.daily.length)) : [];
  const prevRevenue = sum(prev, "revenue");
  const growth = prevRevenue ? ((now.totals.revenue - prevRevenue) / prevRevenue) * 100 : null;

  const o = now.outcomes;
  const finished = o.delivered + o.returned + o.cancelled + o.rejected;
  const lowItems = items.filter(isLow).sort((a, b) => a.stock - b.stock);

  const commission = now.totals.commission || Math.round(now.totals.revenue * 0.1);
  const sellerEarnings = now.totals.sellerEarnings || now.totals.revenue - commission;

  const cards = [
    {
      label: "Net Earnings (Payout)",
      value: formatPrice(sellerEarnings),
      note: growth === null ? "90% after platform cut (" + range.note + ")" : (growth >= 0 ? "▲ " : "▼ ") + Math.abs(growth).toFixed(1) + "% vs prev period",
      tone: growth === null ? "" : growth >= 0 ? "up" : "down",
    },
    {
      label: "Gross Sales",
      value: formatPrice(now.totals.revenue),
      note: "Total customer order volume",
    },
    {
      label: "Admin Commission",
      value: formatPrice(commission),
      note: "10% platform marketplace fee",
      tone: "down",
    },
    { label: "Orders Count", value: now.totals.orders, note: "Accepted, " + range.note },
    {
      label: "Low Stock Alert",
      value: lowItems.length,
      note: lowItems.length ? "Products with fewer than " + LOW_STOCK_BELOW + " left" : "All products well stocked",
      tone: lowItems.length ? "down" : "up",
    },
  ];

  const outcomeRows = [
    { key: "delivered", label: "Delivered", n: o.delivered, cls: "o-good" },
    { key: "returned", label: "Returned", n: o.returned, cls: "o-warn" },
    { key: "cancelled", label: "Cancelled", n: o.cancelled, cls: "o-bad" },
    { key: "rejected", label: "Rejected by you", n: o.rejected, cls: "o-mute" },
  ];

  return (
    <div className={"dash-stack" + (loading ? " is-loading" : "")}>
      <div className="dash-row between">
        <p className="dash-note left">Numbers come from your store database.</p>
        <div className="seg" role="tablist">
          {RANGES.map((r) => (
            <button key={r.days} className={days === r.days ? "on" : ""} onClick={() => setDays(r.days)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className="panel stat">
            <span className="eyebrow">{c.label}</span>
            <b className="stat-value">{c.value}</b>
            <span className={"stat-note " + (c.tone || "")}>{c.note}</span>
          </div>
        ))}
      </div>

      {lowItems.length > 0 && (
        <section className="panel alert-panel">
          <div className="dash-row between">
            <h2 className="stack-title small">
              <em>Needs attention</em>
              <strong>Low-stock alerts</strong>
            </h2>
            <GlassButton onClick={() => goTo("inventory")}>Restock now →</GlassButton>
          </div>
          <div className="alert-list">
            {lowItems.map((i) => (
              <div key={i.id} className="alert-row">
                <span>{i.name}</span>
                <span className={"badge " + (i.stock === 0 ? "st-cancel" : "st-packed")}>{i.stock === 0 ? "Out of stock" : i.stock + " left"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel sales-graph-panel">
        <div className="dash-row between">
          <h2 className="stack-title small">
            <em>Revenue &amp; Performance Trends</em>
            <strong>Store Sales Graph</strong>
          </h2>
          <span className="pill">{range.label} ({now.daily.length} days plotted)</span>
        </div>
        <SalesGraph daily={now.daily} days={days} />
      </section>

      <div className="two-col">
        <section className="panel">
          <h2 className="stack-title small">
            <em>Order results</em>
            <strong>Delivered vs returned</strong>
          </h2>
          {finished === 0 ? (
            <p className="dash-note">No finished orders in this period.</p>
          ) : (
            <>
              <div className="outcome-bar" role="img" aria-label="Order results">
                {outcomeRows.map((r) => r.n > 0 && <span key={r.key} className={r.cls} style={{ flex: r.n }} title={r.label + ": " + r.n} />)}
              </div>
              <div className="outcome-list">
                {outcomeRows.map((r) => (
                  <div key={r.key} className="outcome-item">
                    <span className={"dot " + r.cls} />
                    <span>{r.label}</span>
                    <b>{r.n}</b>
                    <span className="muted">{Math.round((r.n / finished) * 100)}%</span>
                  </div>
                ))}
              </div>
              <p className="dash-note left">
                {Math.round((o.delivered / finished) * 100)}% of finished orders reached the customer successfully.
              </p>
            </>
          )}
        </section>

        <section className="panel">
          <h2 className="stack-title small">
            <em>What sells</em>
            <strong>By category</strong>
          </h2>
          <HBars rows={now.byCategory.slice(0, 6).map((c) => ({ label: catLabel(c.category), value: c.revenue, text: formatPrice(c.revenue) }))} />
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2 className="stack-title small">
            <em>How busy</em>
            <strong>Orders per day</strong>
          </h2>
          <ColumnChart data={now.daily.map((d) => ({ label: dayLabel(d.date), value: d.orders }))} />
        </section>

        <section className="panel">
          <h2 className="stack-title small">
            <em>Best sellers</em>
            <strong>Top items</strong>
          </h2>
          <HBars rows={now.topItems.map((t) => ({ label: t.name, value: t.units, text: t.units + " sold" }))} />
        </section>
      </div>
    </div>
  );
}