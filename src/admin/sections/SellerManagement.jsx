import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { fetchSellers, approveSeller, rejectSeller, blockSeller, unblockSeller } from "../../api/adminSellers.js";
import {
  Title, Seg, Chips, Search, Badge, Person, Empty, Confirm, Modal, Details, GlassButton, Pager, usePaged, useSort,
  fmtDate, fmtDateTime, timeAgo, rupees, compactRupees, num, matches,
} from "../ui.jsx";

// Other admin pages import this, so it stays exported (demo orders never match real sellers, so it shows zeros for them)
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

// The backend sends { id, name, email, phone, shopName, city, status, createdAt }.
// This fills in the extra fields the screen expects, so nothing crashes while the backend does not store them yet.
const toSeller = (r) => ({
  id: r.id,
  name: r.name,
  business: r.shopName || r.name,
  email: r.email,
  phone: r.phone || "—",
  city: r.city || "—",
  pincode: "",
  gstin: "—",
  categories: [],
  status: r.status,
  statusNote: "",
  registeredAt: r.createdAt,
  approvedAt: r.status === "PENDING" || r.status === "REJECTED" ? null : r.createdAt,
  lastActiveAt: r.createdAt,
  rating: 0,
  products: 0,
  history: [{ at: r.createdAt, text: "Registered as a seller" }],
});

export default function SellerManagement({ view, setView }) {
  const { db } = useAdmin();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [details, setDetails] = useState(null);
  const tab = view === "active" ? "active" : "requests";

  const load = useCallback(async () => {
    try {
      setError("");
      const rows = await fetchSellers();
      setSellers(rows.map(toSeller));
    } catch (e) {
      setError(e.message || "Could not load sellers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // calls the backend, then reloads the list
  const doAct = async (fn, id) => {
    try {
      setError("");
      await fn(id);
      await load();
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setConfirm(null);
  };

  const counts = {
    PENDING: sellers.filter((s) => s.status === "PENDING").length,
    approved: sellers.filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED").length,
  };

  const act = (kind, s) => setConfirm({ kind, s });
  const shown = details && sellers.find((s) => s.id === details);

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

      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" className="link-btn" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {loading && <p className="dash-note left">Loading sellers…</p>}

      {!loading && (tab === "requests" ? <Requests db={db} sellers={sellers} onAct={act} onView={setDetails} /> : <Approved db={db} sellers={sellers} onAct={act} onView={setDetails} />)}

      {shown && <SellerDetails db={db} s={shown} onClose={() => setDetails(null)} onAct={act} />}

      {confirm?.kind === "approve" && (
        <Confirm
          title="Approve seller?"
          message={
            <>
              <b>{confirm.s.business}</b> ({confirm.s.name}) will change from <b>PENDING</b> to <b>ACTIVE</b> and can log in and start selling.
            </>
          }
          confirm="Approve seller"
          onConfirm={() => doAct(approveSeller, confirm.s.id)}
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
          reason="Reason (not saved yet)"
          reasonPlaceholder="e.g. GST certificate missing or unreadable"
          onConfirm={() => doAct(rejectSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "block" && (
        <Confirm
          title="Block this seller?"
          message={
            <>
              <b>{confirm.s.business}</b> will be deactivated and cannot log in until you reactivate them. Orders already placed are not affected.
            </>
          }
          confirm="Block seller"
          danger
          reason="Reason for blocking (not saved yet)"
          reasonPlaceholder="e.g. repeated counterfeit complaints"
          onConfirm={() => doAct(blockSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "reactivate" && (
        <Confirm
          title="Reactivate seller?"
          message={
            <>
              <b>{confirm.s.business}</b> will be <b>ACTIVE</b> again and can log in.
            </>
          }
          confirm="Reactivate"
          onConfirm={() => doAct(unblockSeller, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ---------------- A. registration requests ---------------- */
function Requests({ sellers, onAct, onView }) {
  const [filter, setFilter] = useState("PENDING");
  const [q, setQ] = useState("");
  const now = Date.now();
  const isRecent = (s) => s.approvedAt && now - Date.parse(s.approvedAt) < 30 * 864e5;
  const apps = sellers.filter((s) =>
    filter === "PENDING" ? s.status === "PENDING" : filter === "REJECTED" ? s.status === "REJECTED" : filter === "recent" ? isRecent(s) : true
  );
  const list = apps.filter((s) => matches(q, s.name, s.business, s.email, s.phone, s.city)).sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  const recent = sellers.filter(isRecent).length;

  return (
    <section className="panel">
      <Title em="New seller sign-ups" strong="Registration requests" />
      <div className="dash-row filters">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "PENDING", label: "Pending", count: sellers.filter((s) => s.status === "PENDING").length },
            { id: "recent", label: "Approved (30 days)", count: recent },
            { id: "REJECTED", label: "Rejected", count: sellers.filter((s) => s.status === "REJECTED").length },
            { id: "all", label: "All applications", count: sellers.length },
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
                  ["Location", s.city],
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
                  <span className="muted ad-small">{s.status === "REJECTED" ? "Application closed" : "Approved"}</span>
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
function Approved({ db, sellers, onAct, onView }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      sellers
        .filter((s) => s.status === "ACTIVE" || s.status === "BLOCKED")
        .map((s) => ({ ...s, stats: sellerStats(db, s.id) })),
    [db, sellers]
  );
  const filtered = rows.filter((s) => (filter === "all" || s.status === filter) && matches(q, s.name, s.business, s.email, s.city, s.id));
  const { sorted, th } = useSort(filtered, { key: "since", dir: "desc" }, {
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
                  <th>Status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((s) => (
                  <tr key={s.id} className={s.status === "BLOCKED" ? "ad-row-dim" : ""}>
                    <td>
                      <Person name={s.business} sub={s.name + " · #" + s.id} />
                    </td>
                    <td className="ad-small">
                      {s.email}
                      <br />
                      <span className="muted">{s.phone}</span>
                    </td>
                    <td>{s.approvedAt ? fmtDate(s.approvedAt) : "—"}</td>
                    <td className="num">{num(s.stats.count)}</td>
                    <td className="num">{rupees(s.stats.gmv)}</td>
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

/* ---------------- details ---------------- */
function SellerDetails({ db, s, onClose, onAct }) {
  const st = sellerStats(db, s.id);
  return (
    <Modal title={s.business} onClose={onClose} wide>
      <div className="ad-detail-head">
        <Person name={s.name} sub={"#" + s.id + " · " + s.city} />
        <Badge status={s.status} />
      </div>
      <div className="ad-mini-stats">
        <div>
          <b>{num(st.count)}</b>
          <span>Orders · 45 days</span>
        </div>
        <div>
          <b>{compactRupees(st.gmv)}</b>
          <span>GMV · 45 days</span>
        </div>
      </div>
      <Details
        rows={[
          ["Owner", s.name],
          ["Shop", s.business],
          ["Email", s.email],
          ["Contact", s.phone],
          ["City", s.city],
          ["Registered", fmtDateTime(s.registeredAt)],
        ]}
      />
      <div className="ad-modal-actions">
        {s.status === "PENDING" && (
          <>
            <GlassButton onClick={() => onAct("reject", s)}>Reject</GlassButton>
            <GlassButton variant="solid" onClick={() => onAct("approve", s)}>
              Approve seller
            </GlassButton>
          </>
        )}
        {s.status === "REJECTED" && (
          <GlassButton variant="solid" onClick={() => onAct("approve", s)}>
            Approve seller
          </GlassButton>
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