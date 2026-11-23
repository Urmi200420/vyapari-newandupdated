import { useState } from "react";
import { getOrders } from "../api";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import Invoice from "./Invoice.jsx";
import { useAsync, Loading, ErrorNote, StatusBadge, fmtDate } from "./parts.jsx";

const DONE = ["DELIVERED", "CANCELLED", "REJECTED", "RETURNED"];
const PAGE = 12;

export default function History() {
  const { data, error, reload } = useAsync(getOrders);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [invoice, setInvoice] = useState(null);

  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading order history..." />;

  const past = data.filter((o) => DONE.includes(o.status));
  const q = query.trim().toLowerCase();
  const rows = past.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (!q || o.customer.toLowerCase().includes(q) || ("ord-" + o.id).includes(q) || o.items.some((l) => l.name.toLowerCase().includes(q)))
  );
  const delivered = past.filter((o) => o.status === "DELIVERED");

  return (
    <section className="panel">
      <h2 className="stack-title small">
        <em>All finished orders</em>
        <strong>Order history</strong>
      </h2>

      <div className="dash-row summary">
        <span className="pill">{delivered.length} delivered</span>
        <span className="pill">{past.length - delivered.length} not completed</span>
        <span className="pill">{formatPrice(delivered.reduce((s, o) => s + o.total, 0))} earned</span>
      </div>

      <div className="dash-row filters">
        <input className="search" type="search" placeholder="Search by customer, order number or item" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }} aria-label="Filter by status">
          <option value="all">All</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="RETURNED">Returned</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="dash-note">No orders match.</p>
      ) : (
        <div className="table-wrap" data-lenis-prevent-wheel>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Bill</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>ORD-{o.id}</b>
                  </td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td>{o.customer}</td>
                  <td className="items-cell">{o.items.map((l) => l.name + " ×" + l.qty).join(", ")}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    {o.status === "DELIVERED" || o.status === "RETURNED" ? (
                      <button className="link-btn" onClick={() => setInvoice(o)}>
                        Invoice
                      </button>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > shown && (
        <div className="dash-row center">
          <GlassButton onClick={() => setShown(shown + PAGE)}>Show more ({rows.length - shown} left)</GlassButton>
        </div>
      )}
      {invoice && <Invoice order={invoice} onClose={() => setInvoice(null)} />}
    </section>
  );
}