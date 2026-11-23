import { useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { reviewRefund, decideRefund, completeReturn } from "../data/store.js";
import { REFUND_COUNTED } from "../data/finance.js";
import { Title, Seg, Chips, Search, Badge, StatCard, Empty, Confirm, Modal, Details, GlassButton, Pager, usePaged, fmtDate, fmtDateTime, timeAgo, rupees, compactRupees, num, matches } from "../ui.jsx";

const TYPE = { RETURN: ["↩️", "Return"], REFUND: ["💸", "Refund"] };

export default function RefundManagement() {
  const { db } = useAdmin();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("todo");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const ofType = db.refunds.filter((r) => type === "all" || r.type === type);
  const list = ofType
    .filter((r) => (status === "all" || (status === "todo" ? r.status === "PENDING" || r.status === "UNDER_REVIEW" : r.status === status)) && matches(q, r.id, r.orderId, r.customerName, r.sellerName, r.item))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const paged = usePaged(list, 10, type + status + q);
  const n = (s) => ofType.filter((r) => r.status === s).length;

  const waiting = db.refunds.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW");
  const decided = db.refunds.filter((r) => r.decidedAt);
  const refunded = db.refunds.filter((r) => REFUND_COUNTED.includes(r.status));
  const avgHours = decided.length ? decided.reduce((s, r) => s + (Date.parse(r.decidedAt) - Date.parse(r.requestedAt)), 0) / decided.length / 36e5 : 0;
  const request = open && db.refunds.find((r) => r.id === open);

  return (
    <div className="dash-stack ad-stack">
      <div className="stat-grid">
        <StatCard icon="⏳" label="Awaiting decision" value={num(waiting.length)} note={compactRupees(waiting.reduce((s, r) => s + r.amount, 0)) + " requested"} tone={waiting.length ? "down" : "up"} />
        <StatCard icon="💸" label="Refunded so far" value={compactRupees(refunded.reduce((s, r) => s + r.amount, 0))} note={refunded.length + " approved requests (45 days)"} />
        <StatCard icon="⚖️" label="Approval rate" value={decided.length ? Math.round((refunded.length / decided.length) * 100) + "%" : "—"} note={db.refunds.filter((r) => r.status === "REJECTED").length + " rejected"} />
        <StatCard icon="⏱️" label="Avg. decision time" value={decided.length ? (avgHours < 48 ? Math.round(avgHours) + " h" : (avgHours / 24).toFixed(1) + " d") : "—"} note="From request to decision" />
      </div>

      <section className="panel">
        <Title em="Customer requests" strong="Returns & refunds">
          <Seg
            label="Request type"
            value={type}
            onChange={setType}
            options={[
              { id: "all", label: "All", count: db.refunds.length },
              { id: "RETURN", icon: "↩️", label: "Returns", count: db.refunds.filter((r) => r.type === "RETURN").length },
              { id: "REFUND", icon: "💸", label: "Refunds", count: db.refunds.filter((r) => r.type === "REFUND").length },
            ]}
          />
        </Title>
        <div className="dash-row filters">
          <Search value={q} onChange={setQ} placeholder="Search request ID, order ID, customer, seller or item" />
        </div>
        <Chips
          value={status}
          onChange={setStatus}
          options={[
            { id: "todo", label: "Needs decision", count: n("PENDING") + n("UNDER_REVIEW") },
            { id: "PENDING", label: "New", count: n("PENDING") },
            { id: "UNDER_REVIEW", label: "Under review", count: n("UNDER_REVIEW") },
            { id: "APPROVED", label: "Approved", count: n("APPROVED") },
            { id: "COMPLETED", label: "Completed", count: n("COMPLETED") },
            { id: "REJECTED", label: "Rejected", count: n("REJECTED") },
            { id: "all", label: "All", count: ofType.length },
          ]}
        />

        {list.length === 0 ? (
          <Empty icon={status === "todo" ? "✅" : "🔎"} text={status === "todo" && !q ? "No requests are waiting for a decision." : "No requests match these filters."} />
        ) : (
          <>
            <div className="table-wrap" data-lenis-prevent-wheel>
              <table className="table ad-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Seller</th>
                    <th>Reason</th>
                    <th className="num">Amount</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th className="num">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.slice.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.id}</b>
                        <br />
                        <span className={"ad-type " + r.type.toLowerCase()}>
                          {TYPE[r.type][0]} {TYPE[r.type][1]}
                        </span>
                      </td>
                      <td>{r.orderId}</td>
                      <td>{r.customerName}</td>
                      <td className="ad-small">{r.sellerName}</td>
                      <td className="items-cell">
                        {r.reason}
                        <br />
                        <span className="muted ad-small">{r.item}</span>
                      </td>
                      <td className="num">{rupees(r.amount)}</td>
                      <td className="ad-small">{timeAgo(r.requestedAt)}</td>
                      <td>
                        <Badge status={r.status} label={r.status === "PENDING" ? "New" : undefined} />
                      </td>
                      <td className="num">
                        <div className="ad-row-actions end">
                          <button type="button" className="link-btn" onClick={() => setOpen(r.id)}>
                            Review
                          </button>
                          {(r.status === "PENDING" || r.status === "UNDER_REVIEW") && (
                            <>
                              <button type="button" className="link-btn" onClick={() => setConfirm({ r, approve: true })}>
                                Approve
                              </button>
                              <button type="button" className="link-btn danger" onClick={() => setConfirm({ r, approve: false })}>
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager paged={paged} />
          </>
        )}
      </section>

      {request && <RequestDetails r={request} onClose={() => setOpen(null)} onDecide={(approve) => setConfirm({ r: request, approve })} />}
      {confirm && <Decide {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}

function Decide({ r, approve, onClose }) {
  const { run } = useAdmin();
  return (
    <Confirm
      title={approve ? `Approve ${TYPE[r.type][1].toLowerCase()}?` : `Reject ${TYPE[r.type][1].toLowerCase()}?`}
      message={
        approve ? (
          <>
            <b>{rupees(r.amount)}</b> will be refunded to <b>{r.customerName}</b> for order {r.orderId}. The amount is deducted from {r.sellerName}'s next settlement
            {r.type === "RETURN" ? " and a return pickup is scheduled." : "."}
          </>
        ) : (
          <>
            {r.customerName}'s request <b>{r.id}</b> for {rupees(r.amount)} will be rejected. They will see the reason below.
          </>
        )
      }
      confirm={approve ? "Approve & refund" : "Reject request"}
      danger={!approve}
      reason={approve ? "Note for the record" : "Reason for rejection"}
      reasonRequired={!approve}
      reasonPlaceholder={approve ? "Optional" : "e.g. Outside the 7-day return window"}
      onConfirm={(note) => run(decideRefund, r.id, approve, note)}
      onClose={onClose}
    />
  );
}

function RequestDetails({ r, onClose, onDecide }) {
  const { db, run } = useAdmin();
  const o = db.orders.find((x) => x.id === r.orderId);
  const customer = db.customers.find((c) => c.id === r.customerId);
  const seller = db.sellers.find((s) => s.id === r.sellerId);
  const open = r.status === "PENDING" || r.status === "UNDER_REVIEW";
  const steps = [
    ["Requested", r.requestedAt, true],
    ["Under review", null, r.status !== "PENDING"],
    [r.status === "REJECTED" ? "Rejected" : "Approved", r.decidedAt, !!r.decidedAt],
    r.type === "RETURN" && r.status !== "REJECTED" && ["Item picked up", null, r.status === "COMPLETED"],
  ].filter(Boolean);
  return (
    <Modal title={TYPE[r.type][1] + " request " + r.id} onClose={onClose} wide>
      <div className="ad-detail-head">
        <span className={"ad-type big " + r.type.toLowerCase()}>
          {TYPE[r.type][0]} {TYPE[r.type][1]} · {rupees(r.amount)}
        </span>
        <Badge status={r.status} label={r.status === "PENDING" ? "New" : undefined} />
      </div>
      <ol className="ad-stepper small">
        {steps.map(([label, at, done], i) => (
          <li key={label} className={done ? "done" : i === steps.findIndex((s) => !s[2]) ? "now" : ""}>
            <span className="ad-step-dot">{done ? "✓" : i + 1}</span>
            <b>{label}</b>
            <small>{at ? fmtDate(at) : done ? "Done" : "—"}</small>
          </li>
        ))}
      </ol>
      <p className="ad-callout">
        <b>Reason:</b> {r.reason}
        <br />
        <span className="muted">{r.details}</span>
      </p>
      <div className="two-col ad-order-cols">
        <Details
          rows={[
            ["Order ID", r.orderId],
            ["Item", r.item],
            ["Order amount", o ? rupees(o.amount) : "—"],
            ["Order delivered", o?.deliveredAt ? fmtDateTime(o.deliveredAt) : "—"],
            ["Payment", o ? o.method : "—"],
          ]}
        />
        <Details
          rows={[
            ["Customer", r.customerName + " · " + r.customerId],
            ["Customer contact", customer?.phone || "—"],
            ["Seller", r.sellerName + " · " + r.sellerId],
            ["Seller contact", seller?.phone || "—"],
            ["Requested", fmtDateTime(r.requestedAt)],
            r.decidedAt && ["Decided", fmtDateTime(r.decidedAt) + " by " + r.decidedBy],
            r.adminNote && ["Admin note", r.adminNote],
          ]}
        />
      </div>
      <div className="ad-modal-actions">
        {r.status === "PENDING" && <GlassButton onClick={() => run(reviewRefund, r.id)}>Start review</GlassButton>}
        {open && (
          <>
            <GlassButton className="ad-danger-btn" onClick={() => onDecide(false)}>
              Reject
            </GlassButton>
            <GlassButton variant="solid" onClick={() => onDecide(true)}>
              Approve & refund
            </GlassButton>
          </>
        )}
        {r.status === "APPROVED" && r.type === "RETURN" && (
          <GlassButton variant="solid" onClick={() => run(completeReturn, r.id)}>
            Mark item picked up
          </GlassButton>
        )}
      </div>
    </Modal>
  );
}
