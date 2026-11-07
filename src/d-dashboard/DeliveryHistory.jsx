import { useState } from "react";
import { formatPrice } from "../data.js";
import { fmtDate, fmtTime } from "../s-dashboard/parts.jsx";

const PAGE = 10;

export default function DeliveryHistory({ history = [] }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtered = history.filter((o) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      ("ord-" + o.id).includes(q) ||
      o.customer?.toLowerCase().includes(q) ||
      o.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dash-stack">
      <div className="dash-row between">
        <h2 className="stack-title small">
          <em>Completed runs</em>
          <strong>Trip History ({history.length})</strong>
        </h2>
        <span className="pill" style={{ color: "#86efac" }}>
          Total Delivery Income: {formatPrice(history.length * 40)}
        </span>
      </div>

      <div className="dash-row filters">
        <input
          className="search"
          type="search"
          placeholder="Search by Order ID, customer, or address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "2rem" }}>
          <p className="dash-note">No completed trips found.</p>
        </div>
      ) : (
        <div className="table-wrap" data-lenis-prevent-wheel>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Delivered At</th>
                <th className="num">COD Collected</th>
                <th className="num">Your Earnings</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, shown).map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>ORD-{o.id}</b>
                    <br />
                    <span className="muted" style={{ fontSize: "0.74rem" }}>PIN: {o.pincode || "700029"}</span>
                  </td>
                  <td>
                    <b>{o.customer}</b>
                    <br />
                    <span className="muted" style={{ fontSize: "0.75rem" }}>{o.address}</span>
                  </td>
                  <td>
                    {fmtDate(o.deliveredAt || o.createdAt)}
                    <br />
                    <span className="muted">{fmtTime(o.deliveredAt || o.createdAt)}</span>
                  </td>
                  <td className="num font-bold">{formatPrice(o.total)}</td>
                  <td className="num font-bold" style={{ color: "#86efac" }}>
                    +₹40
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > shown && (
        <div className="dash-row center">
          <button className="btn btn-glass btn-load-more" onClick={() => setShown(shown + PAGE)}>
            Load More Trips ({filtered.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
}
