import { useMemo, useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { approveSeller, rejectSeller, blockSeller, reactivateSeller } from "../data/store.js";
import {
  Title, Seg, Chips, Search, Badge, Person, Empty, Confirm, Modal, Details, GlassButton, Pager, usePaged, useSort,
  fmtDate, fmtDateTime, timeAgo, rupees, compactRupees, num, matches,
} from "../ui.jsx";

const catName = (db, id) => db.categories.find((c) => c.id === id)?.name || id;

export function sellerStats(db, id) {
  const orders = db.orders.filter((o) => o.sellerId === id);
  const live = orders.filter((o) => o.status !== "CANCELLED");
  return {
    orders,
    count: orders.length,
    gmv: live.reduce((s, o) => s + o.amount, 0),
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
    cancelled: orders.length - live.length,
    refunds: db.refunds.filter((r) => r.sellerId === id),
    tickets: db.tickets.filter((t) => t.userType === "seller" && t.raisedById === id),
  };
}

export default function SellerManagement({ view, setView }) {
  const { db, run } = useAdmin();
  const [confirm, setConfirm] = useState(null);
  const [details, setDetails] = useState(null);
  const tab = view === "active" ? "active" : "requests";

  const counts = {
    PENDING: db.sellers.filter((s) => s.status === "PENDING").length,
    approved: db.sellers.filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED").length,
  };

  const act = (kind, s) => setConfirm({ kind, s });
  const shown = details && db.sellers.find((s) => s.id === details);

  return (
    <div className="dash-stack ad-stack">
      <div className="dash-row between">
        <Seg
          label="Seller views"
          value={tab}
          onChange={setView}
          options={[
            { id: "requests", icon: "📝", label: "Registration requests", count: counts.PENDING },
            { id: "active", icon: "🏪", label: "Approved sellers", count: counts.approved },
          ]}
        />
        <div className="ad-legend">
          <Badge status="PENDING" /> <Badge status="ACTIVE" /> <Badge status="BLOCKED" /> <Badge status="REJECTED" />
        </div>
      </div>

      {tab === "requests" ? <Requests db={db} onAct={act} onView={setDetails} /> : <Approved db={db} onAct={act} onView={setDetails} />}

      {shown && <SellerDetails db={db} s={shown} onClose={() => setDetails(null)} onAct={act} />}

      {confirm?.kind === "approve" && (
        <Confirm
          title="Approve seller?"
          message={
            <>
              <b>{confirm.s.business}</b> ({confirm.s.name}) will change from <b>PENDING</b> to <b>ACTIVE</b> and can start selling.
            </>
          }
          confirm="Approve seller"
          onConfirm={() => run(approveSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "reject" && (
        <Confirm
          title="Reject application?"
          message={
            <>
              <b>{confirm.s.business}</b> will change from <b>PENDING</b> to <b>REJECTED</b>.
            </>
          }
          confirm="Reject"
          danger
          reason="Reason shown to the seller"
          reasonPlaceholder="e.g. GST certificate missing or unreadable"
          onConfirm={(r) => run(rejectSeller, confirm.s.id, r)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "block" && (
        <Confirm
          title="Block this seller?"
          message={
            <>
              <b>{confirm.s.business}</b> will be deactivated. Their products are hidden from customers until you reactivate them. Orders already placed are not affected.
            </>
          }
          confirm="Block seller"
          danger
          reason="Reason for blocking"
          reasonRequired
          reasonPlaceholder="e.g. repeated counterfeit complaints"
          onConfirm={(r) => run(blockSeller, confirm.s.id, r)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "reactivate" && (
        <Confirm
          title="Reactivate seller?"
          message={
            <>
              <b>{confirm.s.business}</b> will be <b>ACTIVE</b> again and their listings become visible.
              {confirm.s.statusNote && <span className="ad-quote">Blocked for: {confirm.s.statusNote}</span>}
            </>
          }
          confirm="Reactivate"
          onConfirm={() => run(reactivateSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ---------------- A. registration requests ---------------- */
function Requests({ db, onAct, onView }) {
  const [filter, setFilter] = useState("PENDING");
  const [q, setQ] = useState("");
  const now = Date.now();
  const apps = db.sellers.filter((s) =>
    filter === "PENDING" ? s.status === "PENDING" : filter === "REJECTED" ? s.status === "REJECTED" : filter === "recent" ? s.approvedAt && now - Date.parse(s.approvedAt) < 30 * 864e5 : true
  );
  const list = apps.filter((s) => matches(q, s.name, s.business, s.email, s.phone, s.city)).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  const recent = db.sellers.filter((s) => s.approvedAt && now - Date.parse(s.approvedAt) < 30 * 864e5).length;

  return (
    <section className="panel">
      <Title em="New seller sign-ups" strong="Registration requests" />
      <div className="dash-row filters">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "PENDING", label: "Pending", count: db.sellers.filter((s) => s.status === "PENDING").length },
            { id: "recent", label: "Approved (30 days)", count: recent },
            { id: "REJECTED", label: "Rejected", count: db.sellers.filter((s) => s.status === "REJECTED").length },
            { id: "all", label: "All applications", count: db.sellers.length },
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search name, business, email or phone" />
      </div>
      {list.length === 0 ? (
        <Empty icon={filter === "PENDING" ? "✅" : "🔎"} text={filter === "PENDING" && !q ? "No pending registrations. New sign-ups will appear here." : "No sellers match this filter."} />
      ) : (
        <div className="ad-app-grid">
          {list.map((s) => (
            <article key={s.id} className={"ad-app " + s.status.toLowerCase()}>
              <div className="ad-app-head">
                <Person name={s.name} sub={s.business} />
                <Badge status={s.status} />
              </div>
              <Details
                rows={[
                  ["Email", <a href={"mailto:" + s.email}>{s.email}</a>],
                  ["Contact", s.phone],
                  ["Registered", fmtDate(s.registeredAt) + " · " + timeAgo(s.registeredAt)],
                  ["Location", s.city + " " + s.pincode],
                  ["Sells", s.categories.map((c) => catName(db, c)).join(", ")],
                  s.statusNote && [s.status === "REJECTED" ? "Rejected for" : "Note", s.statusNote],
                ]}
              />
              <div className="ad-app-actions">
                {s.status === "PENDING" ? (
                  <>
                    <GlassButton variant="solid" className="ad-sm" onClick={() => onAct("approve", s)}>
                      ✓ Approve
                    </GlassButton>
                    <GlassButton className="ad-sm" onClick={() => onAct("reject", s)}>
                      ✕ Reject
                    </GlassButton>
                  </>
                ) : (
                  <span className="muted ad-small">{s.status === "REJECTED" ? "Application closed" : "Approved " + timeAgo(s.approvedAt)}</span>
                )}
                <button type="button" className="link-btn" onClick={() => onView(s.id)}>
                  View details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- B. approved sellers ---------------- */
function Approved({ db, onAct, onView }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      db.sellers
        .filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED")
        .map((s) => ({ ...s, stats: sellerStats(db, s.id) })),
    [db]
  );
  const filtered = rows.filter((s) => (filter === "all" || s.status === filter) && matches(q, s.name, s.business, s.email, s.city, s.id));
  const { sorted, th } = useSort(filtered, { key: "gmv", dir: "desc" }, {
    name: (s) => s.business,
    since: (s) => s.approvedAt || "",
    orders: (s) => s.stats.count,
    gmv: (s) => s.stats.gmv,
    rating: (s) => s.rating || 0,
    seen: (s) => s.lastActiveAt,
  });
  const paged = usePaged(sorted, 10, filter + q);
  const totalGmv = rows.filter((s) => s.status === "ACTIVE").reduce((t, s) => t + s.stats.gmv, 0);

  return (
    <section className="panel">
      <Title em="Monitor and control" strong="Approved sellers">
        <span className="pill">{compactRupees(totalGmv)} GMV from active sellers · 45 days</span>
      </Title>
      <div className="dash-row filters">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All", count: rows.length },
            { id: "ACTIVE", label: "Active", count: rows.filter((s) => s.status === "ACTIVE").length },
            { id: "BLOCKED", label: "Blocked", count: rows.filter((s) => s.status === "BLOCKED").length },
          ]}
        />
        <Search value={q} onChange={setQ} placeholder="Search seller, business, city or ID" />
      </div>
      {sorted.length === 0 ? (
        <Empty icon="🔎" text="No sellers match your search." />
      ) : (
        <>
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  {th("name", "Seller")}
                  <th>Contact</th>
                  {th("since", "Approved")}
                  {th("orders", "Orders (45d)", "num")}
                  {th("gmv", "GMV (45d)", "num")}
                  {th("rating", "Rating", "num")}
                  {th("seen", "Last active")}
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((s) => (
                  <tr key={s.id} className={s.status === "BLOCKED" ? "ad-row-dim" : ""}>
                    <td>
                      <Person name={s.business} sub={s.name + " · " + s.id} />
                    </td>
                    <td className="ad-small">
                      {s.email}
                      <br />
                      <span className="muted">{s.phone}</span>
                    </td>
                    <td>{s.approvedAt ? fmtDate(s.approvedAt) : "—"}</td>
                    <td className="num">{num(s.stats.count)}</td>
                    <td className="num">{rupees(s.stats.gmv)}</td>
                    <td className="num">{s.rating ? "★ " + s.rating.toFixed(1) : "—"}</td>
                    <td className="ad-small">{timeAgo(s.lastActiveAt)}</td>
                    <td>
                      <Badge status={s.status} />
                    </td>
                    <td className="num">
                      <div className="ad-row-actions end">
                        <button type="button" className="link-btn" onClick={() => onView(s.id)}>
                          View
                        </button>
                        {s.status === "ACTIVE" ? (
                          <button type="button" className="link-btn danger" onClick={() => onAct("block", s)}>
                            Block
                          </button>
                        ) : (
                          <button type="button" className="link-btn" onClick={() => onAct("reactivate", s)}>
                            Reactivate
                          </button>
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
  );
}

/* ---------------- details + activity ---------------- */
function SellerDetails({ db, s, onClose, onAct }) {
  const st = sellerStats(db, s.id);
  const openTickets = st.tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const openRefunds = st.refunds.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length;
  const activity = [
    ...s.history.map((h) => ({ at: h.at, icon: "🛡️", text: h.text })),
    ...st.orders.slice(0, 6).map((o) => ({ at: o.createdAt, icon: "📦", text: `Order ${o.id} from ${o.customerName} · ${rupees(o.amount)} · ${o.status.replace("_", " ").toLowerCase()}` })),
    ...st.tickets.map((t) => ({ at: t.createdAt, icon: "🎫", text: `Raised ticket ${t.id}: ${t.subject}` })),
    ...st.refunds.map((r) => ({ at: r.requestedAt, icon: "↩️", text: `${r.type === "RETURN" ? "Return" : "Refund"} request ${r.id} on ${r.orderId} · ${r.status.replace("_", " ").toLowerCase()}` })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Modal title={s.business} onClose={onClose} wide>
      <div className="ad-detail-head">
        <Person name={s.name} sub={s.id + " · " + s.city} />
        <Badge status={s.status} />
      </div>
      {s.statusNote && <p className={"ad-callout" + (s.status === "BLOCKED" || s.status === "REJECTED" ? " bad" : "")}>{s.statusNote}</p>}
      <div className="ad-mini-stats">
        <div>
          <b>{num(st.count)}</b>
          <span>Orders · 45 days</span>
        </div>
        <div>
          <b>{compactRupees(st.gmv)}</b>
          <span>GMV · 45 days</span>
        </div>
        <div>
          <b>{st.count ? Math.round((st.delivered / st.count) * 100) + "%" : "—"}</b>
          <span>Delivered</span>
        </div>
        <div>
          <b>{openTickets + openRefunds}</b>
          <span>Open tickets & returns</span>
        </div>
      </div>
      <Details
        rows={[
          ["Owner", s.name],
          ["Email", s.email],
          ["Contact", s.phone],
          ["GSTIN", s.gstin],
          ["Pickup pincode", s.pincode + " · " + s.city],
          ["Categories", s.categories.map((c) => catName(db, c)).join(", ")],
          ["Registered", fmtDateTime(s.registeredAt)],
          ["Approved", s.approvedAt ? fmtDateTime(s.approvedAt) : "—"],
          ["Listed products", s.products ? num(s.products) : "—"],
          ["Rating", s.rating ? "★ " + s.rating.toFixed(1) : "—"],
          ["Last active", timeAgo(s.lastActiveAt)],
        ]}
      />
      <h3 className="ad-sub-head">Seller activity</h3>
      {activity.length === 0 ? (
        <p className="dash-note left">No activity yet.</p>
      ) : (
        <ol className="ad-timeline">
          {activity.slice(0, 12).map((a, i) => (
            <li key={i}>
              <span className="ad-tl-icon">{a.icon}</span>
              <div>
                <span>{a.text}</span>
                <small>{fmtDateTime(a.at)}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="ad-modal-actions">
        {s.status === "PENDING" && (
          <>
            <GlassButton onClick={() => onAct("reject", s)}>Reject</GlassButton>
            <GlassButton variant="solid" onClick={() => onAct("approve", s)}>
              Approve seller
            </GlassButton>
          </>
        )}
        {s.status === "ACTIVE" && (
          <GlassButton className="ad-danger-btn" variant="solid" onClick={() => onAct("block", s)}>
            Block seller
          </GlassButton>
        )}
        {s.status === "BLOCKED" && (
          <GlassButton variant="solid" onClick={() => onAct("reactivate", s)}>
            Reactivate seller
          </GlassButton>
        )}
      </div>
    </Modal>
  );
}
