import { useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { approveSeller, rejectSeller, me } from "../data/store.js";
import { dailySeries, money, sumRows, change, countBetween } from "../data/finance.js";
import { DAY, COMMISSION_RATE } from "../data/seed.js";
import { LineChart } from "../../s-dashboard/charts.jsx";
import { scrollToElement } from "../../smoothScroll.js";
import { StatCard, Title, Badge, Chips, Confirm, GlassButton, Person, compactRupees, num, pctNote, timeAgo, rupees, Empty } from "../ui.jsx";

const OPEN_ORDER = ["PENDING", "CONFIRMED", "PROCESSING", "IN_TRANSIT"];

export default function AdminOverview({ goTo, view }) {
  const { db, run } = useAdmin();
  const [confirm, setConfirm] = useState(null);
  const [feed, setFeed] = useState("all");
  const [feedSize, setFeedSize] = useState(12);
  const attnRef = useRef(null);
  const [now] = useState(Date.now);

  useEffect(() => {
    if (view === "attention" && attnRef.current) scrollToElement(attnRef.current);
  }, [view]);

  const m = useMemo(() => {
    const series = dailySeries(db, now);
    const last30 = series.slice(-30);
    const prev30 = series.slice(-60, -30);
    const all = money(sumRows(series));
    const a = sumRows(last30);
    const b = sumRows(prev30);
    const weekly = (list, field) => {
      // cumulative registrations at the end of each of the last 12 weeks
      return Array.from({ length: 12 }, (_, i) => list.filter((x) => Date.parse(x[field]) <= now - (11 - i) * 7 * DAY).length);
    };
    const joined = (list, field) => [countBetween(list, field, now - 30 * DAY, now + 1), countBetween(list, field, now - 60 * DAY, now - 30 * DAY)];
    return { series, last30, all, a, b, weekly, joined, aMoney: money(a), bMoney: money(b) };
  }, [db, now]);

  const pendingSellers = db.sellers.filter((s) => s.status === "PENDING").sort((x, y) => y.registeredAt.localeCompare(x.registeredAt));
  const activeSellers = db.sellers.filter((s) => s.status === "ACTIVE").length;
  const approvedSellers = db.sellers.filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED").length;
  const onDuty = db.delivery.filter((d) => d.status === "ACTIVE" && d.availability !== "OFF_DUTY").length;
  const openOrders = db.orders.filter((o) => OPEN_ORDER.includes(o.status));
  const byStatus = (s) => openOrders.filter((o) => o.status === s).length;
  const unassigned = db.orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status) && !o.deliveryPersonId).length;
  const urgentTickets = db.tickets.filter((t) => t.status === "OPEN" && t.priority === "URGENT").length;
  const openTickets = db.tickets.filter((t) => t.status === "OPEN").length;
  const pendingRefunds = db.refunds.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length;

  const [cNew, cPrev] = m.joined(db.customers, "registeredAt");
  const [sNew, sPrev] = m.joined(db.sellers, "registeredAt");
  const [dNew] = m.joined(db.delivery, "registeredAt");
  const ordersPct = pctNote(change(m.a.orders, m.b.orders));
  const deliveredPct = pctNote(change(m.a.delivered, m.b.delivered));
  const revenuePct = pctNote(change(m.aMoney.commission, m.bMoney.commission));
  const daySpark = (f) => m.last30.map((r) => r[f]);

  const cards = [
    { icon: "🛒", label: "Registered customers", value: num(db.customers.length), note: "+" + cNew + " joined in 30 days" + (cPrev ? " (" + (cNew >= cPrev ? "▲" : "▼") + " vs " + cPrev + ")" : ""), tone: cNew >= cPrev ? "up" : "down", spark: m.weekly(db.customers, "registeredAt"), go: ["users", "customers"] },
    { icon: "🏪", label: "Registered sellers", value: num(db.sellers.length), note: "+" + sNew + " applied in 30 days" + (sPrev ? " (prev. " + sPrev + ")" : ""), tone: "up", spark: m.weekly(db.sellers, "registeredAt"), go: ["users", "sellers"] },
    { icon: "🛵", label: "Delivery personnel", value: num(db.delivery.length), note: onDuty + " on duty now" + (dNew ? " · +" + dNew + " new" : ""), spark: m.weekly(db.delivery, "registeredAt"), go: ["delivery", "team"] },
    { icon: "✅", label: "Active sellers", value: num(activeSellers), note: Math.round((activeSellers / Math.max(1, approvedSellers)) * 100) + "% of approved sellers", tone: "up", go: ["sellers", "active"] },
    { icon: "⏳", label: "Pending approvals", value: num(pendingSellers.length), note: pendingSellers.length ? "Oldest " + timeAgo(pendingSellers[pendingSellers.length - 1].registeredAt) : "All caught up", tone: pendingSellers.length ? "down" : "up", go: ["sellers", "requests"] },
    { icon: "🧾", label: "Total orders", value: num(m.all.orders), note: ordersPct.text, tone: ordersPct.tone, spark: daySpark("orders"), go: ["orders"] },
    { icon: "🕒", label: "Pending orders", value: num(openOrders.length), note: byStatus("PENDING") + byStatus("CONFIRMED") + " new · " + byStatus("PROCESSING") + " packing · " + byStatus("IN_TRANSIT") + " in transit", go: ["orders", "open"] },
    { icon: "📬", label: "Delivered orders", value: num(m.all.delivered), note: deliveredPct.text, tone: deliveredPct.tone, spark: daySpark("delivered"), go: ["orders", "DELIVERED"] },
    { icon: "✖️", label: "Cancelled orders", value: num(m.all.cancelled), note: ((m.all.cancelled / Math.max(1, m.all.orders)) * 100).toFixed(1) + "% cancellation rate", tone: "down", spark: daySpark("cancelled"), go: ["orders", "CANCELLED"] },
    { icon: "💰", label: "Total platform revenue", value: compactRupees(m.all.commission), note: revenuePct.text, tone: revenuePct.tone, spark: m.last30.map((r) => r.gross), go: ["analytics"], hint: Math.round(COMMISSION_RATE * 100) + "% commission on " + compactRupees(m.all.netSales) + " net sales" },
  ];

  /* ---------- recent activity ---------- */
  const activity = useMemo(() => {
    const items = [];
    db.sellers.forEach((s) =>
      items.push({ at: s.registeredAt, type: "seller", icon: "🏪", title: s.status === "PENDING" ? "Seller awaiting approval" : "New seller registration", text: s.business + " · " + s.name, badge: s.status, go: ["sellers", s.status === "PENDING" ? "requests" : "active"] })
    );
    db.customers.forEach((c) => items.push({ at: c.registeredAt, type: "customer", icon: "🛒", title: "New customer registration", text: c.name + " · " + c.city, go: ["users", "customers"] }));
    db.delivery.forEach((d) => items.push({ at: d.registeredAt, type: "delivery", icon: "🛵", title: "New delivery partner", text: d.name + " · " + d.pincodes.join(", "), go: ["delivery", "team"] }));
    db.orders.slice(0, 40).forEach((o) => items.push({ at: o.createdAt, type: "order", icon: "📦", title: "Order placed · " + o.id, text: o.customerName + " → " + o.sellerName + " · " + rupees(o.amount), badge: o.status, go: ["orders"] }));
    db.tickets.filter((t) => t.resolvedAt).forEach((t) => items.push({ at: t.resolvedAt, type: "ticket", icon: "🎫", title: "Ticket " + (t.status === "CLOSED" ? "closed" : "resolved") + " · " + t.id, text: t.subject, badge: t.status, go: ["tickets", t.userType] }));
    db.log.forEach((l) => items.push({ at: l.at, type: "admin", icon: "🛡️", title: "Admin action", text: l.text + " — " + l.by, go: null }));
    return items.filter((x) => Date.parse(x.at) <= Date.now()).sort((a, b) => b.at.localeCompare(a.at));
  }, [db]);
  const FEED = [
    { id: "all", label: "Everything" },
    { id: "seller", label: "Sellers" },
    { id: "customer", label: "Customers" },
    { id: "delivery", label: "Delivery" },
    { id: "order", label: "Orders" },
    { id: "ticket", label: "Resolved tickets" },
    { id: "admin", label: "Admin actions" },
  ].map((f) => ({ ...f, count: f.id === "all" ? undefined : activity.filter((a) => a.type === f.id && Date.now() - Date.parse(a.at) < 7 * DAY).length }));
  const shownFeed = activity.filter((a) => feed === "all" || a.type === feed);

  /* ---------- order pipeline (last 30 days) ---------- */
  const recent = db.orders.filter((o) => Date.parse(o.createdAt) > now - 30 * DAY);
  const pipe = [
    ["Pending", ["PENDING"], "o-mute"],
    ["Confirmed", ["CONFIRMED"], "ad-o-confirmed"],
    ["Processing", ["PROCESSING"], "o-warn"],
    ["In transit", ["IN_TRANSIT"], "ad-o-transit"],
    ["Delivered", ["DELIVERED"], "o-good"],
    ["Cancelled", ["CANCELLED"], "o-bad"],
  ].map(([label, st, cls]) => ({ label, cls, n: recent.filter((o) => st.includes(o.status)).length }));

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="dash-stack ad-stack">
      <section className="panel ad-hero">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h2 className="stack-title">
            <em>{hello},</em>
            <strong>{me(db).name.split(" ")[0]}</strong>
          </h2>
          <p className="ad-hero-sub">
            Here is the whole Vyapari platform at a glance — {num(activeSellers)} active sellers, {num(db.customers.length)} customers and {num(onDuty)} couriers on duty right now.
          </p>
        </div>
        <div className="ad-hero-kpis">
          <div>
            <b>{compactRupees(m.aMoney.gross)}</b>
            <span>Gross sales · 30 days</span>
          </div>
          <div>
            <b>{num(m.a.orders)}</b>
            <span>Orders · 30 days</span>
          </div>
          <div>
            <b>{compactRupees(m.aMoney.platformNet)}</b>
            <span>Net earnings · 30 days</span>
          </div>
        </div>
      </section>

      <div className="ad-stat-grid">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} onClick={() => goTo(...c.go)} />
        ))}
      </div>

      <section ref={attnRef} className={"panel ad-attn-panel" + (view === "attention" ? " ad-flash" : "")}>
        <Title em="Waiting on you" strong="Needs attention" />
        <div className="ad-attn-tiles">
          <button type="button" className="ad-attn-tile" onClick={() => goTo("sellers", "requests")}>
            <b>{pendingSellers.length}</b>
            <span>Seller approvals</span>
          </button>
          <button type="button" className="ad-attn-tile" onClick={() => goTo("delivery", "assign")}>
            <b>{unassigned}</b>
            <span>Orders without a courier</span>
          </button>
          <button type="button" className={"ad-attn-tile" + (urgentTickets ? " hot" : "")} onClick={() => goTo("tickets")}>
            <b>{openTickets}</b>
            <span>Open tickets{urgentTickets ? " · " + urgentTickets + " urgent" : ""}</span>
          </button>
          <button type="button" className="ad-attn-tile" onClick={() => goTo("refunds")}>
            <b>{pendingRefunds}</b>
            <span>Return / refund requests</span>
          </button>
        </div>

        <h3 className="ad-sub-head">Pending seller approval requests</h3>
        {pendingSellers.length === 0 ? (
          <Empty icon="✅" text="No sellers are waiting for approval." />
        ) : (
          <div className="ad-request-list">
            {pendingSellers.map((s) => (
              <div key={s.id} className="ad-request">
                <Person name={s.name} sub={s.business + " · " + s.city} />
                <span className="muted ad-request-when">Applied {timeAgo(s.registeredAt)}</span>
                <Badge status="PENDING" />
                <div className="ad-row-actions">
                  <GlassButton className="ad-sm" variant="solid" onClick={() => setConfirm({ kind: "approve", s })}>
                    Approve
                  </GlassButton>
                  <GlassButton className="ad-sm" onClick={() => setConfirm({ kind: "reject", s })}>
                    Reject
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="panel">
          <Title em="Last 30 days" strong="Gross sales trend">
            <GlassButton className="ad-sm" onClick={() => goTo("analytics")}>
              Full analytics →
            </GlassButton>
          </Title>
          <LineChart data={m.last30.map((r) => ({ label: new Date(r.t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: r.gross }))} />
        </section>

        <section className="panel">
          <Title em="Last 30 days" strong="Order pipeline" />
          {recent.length === 0 ? (
            <Empty text="No orders in the last 30 days." />
          ) : (
            <>
              <div className="outcome-bar" role="img" aria-label="Orders by status">
                {pipe.map((p) => p.n > 0 && <span key={p.label} className={p.cls} style={{ flex: p.n }} title={p.label + ": " + p.n} />)}
              </div>
              <div className="outcome-list">
                {pipe.map((p) => (
                  <div key={p.label} className="outcome-item">
                    <span className={"dot " + p.cls} />
                    <span>{p.label}</span>
                    <b>{p.n}</b>
                    <span className="muted">{Math.round((p.n / recent.length) * 100)}%</span>
                  </div>
                ))}
              </div>
              <p className="dash-note left">{recent.length} orders placed across all sellers in the last 30 days.</p>
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <Title em="Across the platform" strong="Recent activity" />
        <Chips
          options={FEED.map((f) => ({ ...f, label: f.label }))}
          value={feed}
          onChange={(v) => {
            setFeed(v);
            setFeedSize(12);
          }}
        />
        {shownFeed.length === 0 ? (
          <Empty text="Nothing here yet." />
        ) : (
          <ol className="ad-feed">
            {shownFeed.slice(0, feedSize).map((a, i) => (
              <li key={a.type + a.at + i}>
                <span className={"ad-feed-icon " + a.type}>{a.icon}</span>
                <div className="ad-feed-body">
                  <b>{a.title}</b>
                  <span>{a.text}</span>
                </div>
                {a.badge ? <Badge status={a.badge} /> : <span className="ad-feed-nobadge" />}
                <span className="ad-feed-when">{timeAgo(a.at)}</span>
                {a.go ? (
                  <button type="button" className="ad-icon-btn" onClick={() => goTo(...a.go)} aria-label={"Open " + a.title}>
                    →
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
        )}
        {shownFeed.length > feedSize && (
          <div className="dash-row center">
            <GlassButton onClick={() => setFeedSize((n) => n + 12)}>Show more</GlassButton>
          </div>
        )}
      </section>

      {confirm?.kind === "approve" && (
        <Confirm
          title="Approve seller?"
          message={
            <>
              <b>{confirm.s.business}</b> ({confirm.s.name}) will become <b>ACTIVE</b> and can start listing products on Vyapari.
            </>
          }
          confirm="Approve seller"
          onConfirm={() => run(approveSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "reject" && (
        <Confirm
          title="Reject seller?"
          message={
            <>
              <b>{confirm.s.business}</b> will be marked <b>REJECTED</b>. The seller is told the reason below.
            </>
          }
          confirm="Reject"
          danger
          reason="Reason for rejection"
          reasonPlaceholder="e.g. GST certificate missing"
          onConfirm={(r) => run(rejectSeller, confirm.s.id, r)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
