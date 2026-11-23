import { useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { setOrderStatus, ORDER_FLOW } from "../data/store.js";
import {
  Title, Search, Select, Badge, Empty, Confirm, Modal, Details, GlassButton, Pager, usePaged, useSort, STATUS,
  fmtDate, fmtTime, fmtDateTime, rupees, compactRupees, num, matches,
} from "../ui.jsx";

const STAGES = [
  { id: "PENDING", icon: "🆕", label: "Pending" },
  { id: "CONFIRMED", icon: "👍", label: "Confirmed" },
  { id: "PROCESSING", icon: "📦", label: "Processing" },
  { id: "IN_TRANSIT", icon: "🛵", label: "In transit" },
  { id: "DELIVERED", icon: "✅", label: "Delivered" },
  { id: "CANCELLED", icon: "✖️", label: "Cancelled" },
];
const OPEN = ["PENDING", "CONFIRMED", "PROCESSING", "IN_TRANSIT"];
const PAYMENTS = ["PAID", "COD_DUE", "REFUNDED", "PARTIAL_REFUND", "NOT_CHARGED"];
const RANGES = [
  { id: "all", label: "Last 45 days", days: 45 },
  { id: "today", label: "Today", days: 0 },
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
];

export default function OrderManagement({ view, goTo }) {
  const { db } = useAdmin();
  const [status, setStatus] = useState(view === "open" ? "open" : STAGES.some((s) => s.id === view) ? view : "all");
  const [q, setQ] = useState("");
  const [payment, setPayment] = useState("all");
  const [seller, setSeller] = useState("all");
  const [range, setRange] = useState("all");
  const [open, setOpen] = useState(null);

  const since = (() => {
    const r = RANGES.find((x) => x.id === range);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() - r.days * 864e5;
  })();
  const inRange = db.orders.filter((o) => Date.parse(o.createdAt) >= since);
  const courier = (o) => db.delivery.find((d) => d.id === o.deliveryPersonId);
  const filtered = inRange.filter(
    (o) =>
      (status === "all" || (status === "open" ? OPEN.includes(o.status) : o.status === status)) &&
      (payment === "all" || o.payment === payment) &&
      (seller === "all" || o.sellerId === seller) &&
      matches(q, o.id, o.customerName, o.sellerName, courier(o)?.name, ...o.items.map((i) => i.name))
  );
  const { sorted, th } = useSort(filtered, { key: "date", dir: "desc" }, { id: (o) => o.id, date: (o) => o.createdAt, amount: (o) => o.amount, customer: (o) => o.customerName, seller: (o) => o.sellerName });
  const paged = usePaged(sorted, 12, status + q + payment + seller + range);
  const value = filtered.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.amount, 0);
  const sellers = [...new Map(db.orders.map((o) => [o.sellerId, o.sellerName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const order = open && db.orders.find((o) => o.id === open);

  const downloadCsv = () => {
    const head = ["Order ID", "Date", "Customer", "Seller", "Products", "Amount", "Payment method", "Payment status", "Delivery partner", "Status"];
    const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const lines = sorted.map((o) => [o.id, o.createdAt, o.customerName, o.sellerName, o.items.map((i) => i.qty + " x " + i.name).join("; "), o.amount, o.method, STATUS[o.payment]?.[0], courier(o)?.name || "", STATUS[o.status]?.[0] || o.status].map(esc).join(","));
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vyapari-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="dash-stack ad-stack">
      <section className="panel">
        <Title em="Order status monitoring" strong="Lifecycle" >
          <span className="pill">{RANGES.find((r) => r.id === range).label}</span>
        </Title>
        <div className="ad-flow">
          {STAGES.map((s, i) => {
            const n = inRange.filter((o) => o.status === s.id).length;
            return (
              <button key={s.id} type="button" className={"ad-flow-step" + (status === s.id ? " on" : "") + (s.id === "CANCELLED" ? " cancel" : "")} onClick={() => setStatus(status === s.id ? "all" : s.id)} aria-pressed={status === s.id}>
                <span className="ad-flow-icon">{s.icon}</span>
                <b>{num(n)}</b>
                <span>{s.label}</span>
                {i < 4 && <span className="ad-flow-arrow" aria-hidden="true">›</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <Title em="Every transaction on Vyapari" strong="Master order ledger">
          <GlassButton className="ad-sm" onClick={downloadCsv} disabled={!sorted.length}>
            ⤓ Export CSV
          </GlassButton>
        </Title>
        <div className="dash-row filters">
          <Search value={q} onChange={setQ} placeholder="Search order ID, customer, seller, product or courier" />
          <Select
            label="Order status"
            value={status}
            onChange={setStatus}
            options={[{ id: "all", label: "All statuses" }, { id: "open", label: "Open (not finished)" }, ...STAGES.map((s) => ({ id: s.id, label: s.label }))]}
          />
          <Select label="Payment" value={payment} onChange={setPayment} options={[{ id: "all", label: "Any payment" }, ...PAYMENTS.map((p) => ({ id: p, label: STATUS[p][0] }))]} />
          <Select label="Seller" value={seller} onChange={setSeller} options={[{ id: "all", label: "All sellers" }, ...sellers.map(([id, name]) => ({ id, label: name }))]} />
          <Select label="Date range" value={range} onChange={setRange} options={RANGES} />
        </div>
        <p className="dash-note left ad-small">
          {num(filtered.length)} orders · {compactRupees(value)} order value (excluding cancelled) · Orders older than 45 days are settled and counted in Revenue & earnings.
        </p>

        {sorted.length === 0 ? (
          <Empty icon="🔎" text="No orders match these filters." />
        ) : (
          <>
            <div className="table-wrap" data-lenis-prevent-wheel>
              <table className="table ad-table ad-ledger">
                <thead>
                  <tr>
                    {th("id", "Order ID")}
                    {th("customer", "Customer")}
                    {th("seller", "Seller")}
                    <th>Products</th>
                    {th("amount", "Amount", "num")}
                    {th("date", "Order date")}
                    <th>Payment</th>
                    <th>Delivery partner</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.slice.map((o) => {
                    const d = courier(o);
                    return (
                      <tr key={o.id} className="ad-click-row" onClick={() => setOpen(o.id)}>
                        <td>
                          <b>{o.id}</b>
                        </td>
                        <td>{o.customerName}</td>
                        <td>{o.sellerName}</td>
                        <td className="items-cell">
                          {o.items[0].qty} × {o.items[0].name}
                          {o.items.length > 1 && <span className="muted"> + {o.items.length - 1} more</span>}
                        </td>
                        <td className="num">{rupees(o.amount)}</td>
                        <td className="ad-small">
                          {fmtDate(o.createdAt)}
                          <br />
                          <span className="muted">{fmtTime(o.createdAt)}</span>
                        </td>
                        <td>
                          <Badge status={o.payment} />
                          <br />
                          <span className="muted ad-small">{o.method}</span>
                        </td>
                        <td className="ad-small">{d ? d.name : <span className="muted">{OPEN.includes(o.status) ? "Not assigned" : "—"}</span>}</td>
                        <td>
                          <Badge status={o.status} label={o.status === "PENDING" ? "Pending" : undefined} tone={o.status === "PENDING" ? "warn" : undefined} />
                        </td>
                        <td className="num">
                          <button
                            type="button"
                            className="link-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(o.id);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager paged={paged} />
          </>
        )}
      </section>

      {order && <OrderDetails o={order} onClose={() => setOpen(null)} goTo={goTo} />}
    </div>
  );
}

function OrderDetails({ o, onClose, goTo }) {
  const { db, run } = useAdmin();
  const [confirm, setConfirm] = useState(null);
  const d = db.delivery.find((x) => x.id === o.deliveryPersonId);
  const customer = db.customers.find((c) => c.id === o.customerId);
  const seller = db.sellers.find((s) => s.id === o.sellerId);
  const refunds = db.refunds.filter((r) => r.orderId === o.id);
  const idx = ORDER_FLOW.indexOf(o.status);
  const next = idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  const needsCourier = next === "IN_TRANSIT" && !d;
  const reached = (s) => o.timeline.find((t) => t.status === s);

  return (
    <Modal title={"Order " + o.id} onClose={onClose} wide>
      <div className="ad-detail-head">
        <div className="ad-ticket-top">
          <Badge status={o.status} label={o.status === "PENDING" ? "Pending" : undefined} tone={o.status === "PENDING" ? "warn" : undefined} />
          <Badge status={o.payment} />
        </div>
        <span className="muted ad-small">Placed {fmtDateTime(o.createdAt)}</span>
      </div>

      {o.status === "CANCELLED" ? (
        <p className="ad-callout bad">Cancelled — {o.timeline.find((t) => t.status === "CANCELLED")?.note || "no reason recorded"}.</p>
      ) : (
        <ol className="ad-stepper">
          {ORDER_FLOW.map((s, i) => {
            const t = reached(s);
            return (
              <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>
                <span className="ad-step-dot">{i < idx || (i === idx && s === "DELIVERED") ? "✓" : i + 1}</span>
                <b>{STATUS[s]?.[0] || "Pending"}</b>
                <small>{t ? fmtDate(t.at) + ", " + fmtTime(t.at) : "—"}</small>
              </li>
            );
          })}
        </ol>
      )}

      <div className="two-col ad-order-cols">
        <Details
          rows={[
            ["Customer", (customer?.name || o.customerName) + " · " + o.customerId],
            ["Contact", customer?.phone || "—"],
            ["Deliver to", o.address],
            ["Seller", o.sellerName + " · " + o.sellerId],
            ["Seller contact", seller?.phone || "—"],
          ]}
        />
        <Details
          rows={[
            ["Payment", o.method + " · " + STATUS[o.payment][0]],
            ["Delivery partner", d ? d.name + " · " + d.phone : "Not assigned"],
            ["Vehicle", d?.vehicle || "—"],
            ["Delivered", o.deliveredAt ? fmtDateTime(o.deliveredAt) : "—"],
            refunds.length > 0 && ["Returns / refunds", refunds.map((r) => r.id + " (" + STATUS[r.status][0].toLowerCase() + ")").join(", ")],
          ]}
        />
      </div>

      <div className="table-wrap">
        <table className="table ad-table ad-items">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Qty</th>
              <th className="num">Price</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.name}>
                <td>{i.name}</td>
                <td className="num">{i.qty}</td>
                <td className="num">{rupees(i.price)}</td>
                <td className="num">{rupees(i.price * i.qty)}</td>
              </tr>
            ))}
            <tr className="ad-total-row">
              <td colSpan="3">Order amount</td>
              <td className="num">{rupees(o.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="ad-sub-head">Order history</h3>
      <ol className="ad-timeline">
        {[...o.timeline].reverse().map((t, i) => (
          <li key={i}>
            <span className="ad-tl-icon">{t.status === "ASSIGNED" || t.status === "UNASSIGNED" ? "🛵" : t.status === "REFUND" ? "↩️" : t.status === "CANCELLED" ? "✖️" : "•"}</span>
            <div>
              <span>
                {t.status === "ASSIGNED" ? "Courier assigned" : t.status === "UNASSIGNED" ? "Courier removed" : t.status === "REFUND" ? "Refund" : STATUS[t.status]?.[0] || "Pending"}
                {t.note ? " — " + t.note : ""}
              </span>
              <small>{fmtDateTime(t.at)}</small>
            </div>
          </li>
        ))}
      </ol>

      {OPEN.includes(o.status) && (
        <div className="ad-modal-actions">
          <GlassButton className="ad-danger-btn" onClick={() => setConfirm("CANCELLED")}>
            Cancel order
          </GlassButton>
          {needsCourier || (["CONFIRMED", "PROCESSING"].includes(o.status) && !d) ? (
            <GlassButton
              onClick={() => {
                onClose();
                goTo("delivery", "assign");
              }}
            >
              Assign courier →
            </GlassButton>
          ) : null}
          {next && (
            <GlassButton variant="solid" disabled={needsCourier} onClick={() => setConfirm(next)} title={needsCourier ? "Assign a delivery partner first" : ""}>
              Mark as {STATUS[next][0].toLowerCase()}
            </GlassButton>
          )}
        </div>
      )}

      {confirm && (
        <Confirm
          title={confirm === "CANCELLED" ? "Cancel this order?" : "Update order status?"}
          message={
            confirm === "CANCELLED" ? (
              <>
                <b>{o.id}</b> will be cancelled. {o.method === "COD" ? "Nothing was charged (cash on delivery)." : "The " + rupees(o.amount) + " " + o.method + " payment is refunded to the customer."}
              </>
            ) : (
              <>
                <b>{o.id}</b> moves from <b>{STATUS[o.status]?.[0] || "Pending"}</b> to <b>{STATUS[confirm][0]}</b>.
                {confirm === "DELIVERED" && o.method === "COD" && " The COD amount will be marked as collected."}
              </>
            )
          }
          confirm={confirm === "CANCELLED" ? "Cancel order" : "Update status"}
          danger={confirm === "CANCELLED"}
          reason={confirm === "CANCELLED" ? "Cancellation reason" : undefined}
          reasonRequired={confirm === "CANCELLED"}
          reasonPlaceholder="e.g. Seller could not fulfil"
          onConfirm={(note) => run(setOrderStatus, o.id, confirm, note)}
          onClose={() => setConfirm(null)}
        />
      )}
    </Modal>
  );
}
