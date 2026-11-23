import { useEffect, useState } from "react";
import { getOrders, updateOrderStatus } from "../api";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import Invoice from "./Invoice.jsx";
import { useAsync, Loading, ErrorNote, StatusBadge, fmtDate, fmtTime } from "./parts.jsx";

// the four stages a seller works with
const STAGES = [
  { id: "PENDING", label: "Incoming", hint: "New orders waiting for you to accept or reject." },
  { id: "PACKED", label: "Packing", hint: "Accepted orders. Pack them, then mark them ready for pickup." },
  { id: "READY_FOR_PICKUP", label: "Ready for pickup", hint: "Packed and waiting for the delivery partner to collect." },
  { id: "OUT_FOR_DELIVERY", label: "On the way", hint: "Collected and on the way to the customer." },
];
const REASONS = ["Item out of stock", "Can't deliver to this area", "Price or listing error", "Other"];

export default function Orders() {
  const { data, error, loading, reload, setData } = useAsync(getOrders);
  const [stage, setStage] = useState("PENDING");
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { id, reason, note }
  const [actionError, setActionError] = useState("");
  const [invoice, setInvoice] = useState(null);

  // refresh every minute so new orders and new delivery assignments show up
  useEffect(() => {
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);

  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading orders..." />;

  const move = async (order, status, reason = "") => {
    setBusyId(order.id);
    setActionError("");
    try {
      const updated = await updateOrderStatus(order.id, status, reason);
      setData((list) => list.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
      setRejecting(null);
      // after accepting, jump to the next stage so the seller sees where the order went
      if (status === "PACKED") setStage("PACKED");
      if (status === "READY_FOR_PICKUP") setStage("READY_FOR_PICKUP");
    } catch (err) {
      setActionError(err.message || "Could not update the order");
    } finally {
      setBusyId(null);
    }
  };

  const count = (id) => data.filter((o) => o.status === id).length;
  const list = data.filter((o) => o.status === stage);
  const current = STAGES.find((s) => s.id === stage);

  return (
    <section className="panel">
      <div className="dash-row between">
        <h2 className="stack-title small">
          <em>Happening now</em>
          <strong>Orders &amp; delivery</strong>
        </h2>
        <GlassButton onClick={reload} disabled={loading}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </GlassButton>
      </div>

      <div className="chips">
        {STAGES.map((s) => (
          <button key={s.id} className={"chip" + (stage === s.id ? " on" : "")} onClick={() => setStage(s.id)}>
            {s.label} <span className="chip-count">{count(s.id)}</span>
          </button>
        ))}
      </div>
      <p className="dash-note left">{current.hint}</p>
      {actionError && <p className="form-msg error">{actionError}</p>}
      {error && <ErrorNote error={error} onRetry={reload} />}

      {list.length === 0 ? (
        <p className="dash-note">Nothing here right now.</p>
      ) : (
        <div className="order-list">
          {list.map((o) => (
            <article key={o.id} className="order-card">
              <div className="order-main">
                <div className="dash-row">
                  <b className="order-id">ORD-{o.id}</b>
                  <StatusBadge status={o.status} />
                </div>
                <p className="order-meta">
                  {o.customer} · {fmtDate(o.createdAt)}, {fmtTime(o.createdAt)}
                </p>
                <ul className="order-items">
                  {o.items.map((l, i) => (
                    <li key={i}>
                      <span>{l.name}</span>
                      <span>× {l.qty}</span>
                    </li>
                  ))}
                </ul>
                <p className="order-meta">📍 {o.address}</p>
                <b className="order-total">{formatPrice(o.total)}</b>

                <div className="order-actions">
                  {o.status === "PENDING" && (
                    <>
                      <GlassButton variant="solid" disabled={busyId === o.id} onClick={() => move(o, "PACKED")}>
                        ✓ Accept order
                      </GlassButton>
                      <GlassButton disabled={busyId === o.id} onClick={() => setRejecting({ id: o.id, reason: REASONS[0], note: "" })}>
                        ✕ Reject
                      </GlassButton>
                    </>
                  )}
                  {o.status === "PACKED" && (
                    <GlassButton variant="solid" disabled={busyId === o.id} onClick={() => move(o, "READY_FOR_PICKUP")}>
                      📦 Mark ready for pickup
                    </GlassButton>
                  )}
                  {o.status !== "PENDING" && <GlassButton onClick={() => setInvoice(o)}>🧾 Invoice</GlassButton>}
                </div>

                {rejecting?.id === o.id && (
                  <div className="reject-box">
                    <label className="field">
                      Why are you rejecting it?
                      <select className="select" value={rejecting.reason} onChange={(e) => setRejecting({ ...rejecting, reason: e.target.value })}>
                        {REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    {rejecting.reason === "Other" && (
                      <label className="field">
                        Tell the customer why
                        <input value={rejecting.note} maxLength={120} onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })} />
                      </label>
                    )}
                    <div className="dash-row">
                      <GlassButton
                        variant="solid"
                        disabled={busyId === o.id || (rejecting.reason === "Other" && !rejecting.note.trim())}
                        onClick={() => move(o, "REJECTED", rejecting.reason === "Other" ? rejecting.note.trim() : rejecting.reason)}
                      >
                        Confirm reject
                      </GlassButton>
                      <button className="link-btn" onClick={() => setRejecting(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="courier">
                <span className="eyebrow">🛵 Delivery partner (set by admin)</span>
                {o.deliveryPerson ? (
                  <>
                    <b>{o.deliveryPerson.name}</b>
                    <span>{o.deliveryPerson.phone}</span>
                    {o.deliveryPerson.vehicle && <span className="muted">{o.deliveryPerson.vehicle}</span>}
                  </>
                ) : (
                  <span className="muted">{o.status === "PENDING" ? "Assigned after you accept the order" : "Waiting for the admin to assign someone"}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {invoice && <Invoice order={invoice} onClose={() => setInvoice(null)} />}
    </section>
  );
}