import { useMemo, useState } from "react";
import { useAdmin } from "../../AdminContext.jsx";
import { setCustomerStatus } from "../../data/store.js";
import { Title, Chips, Search, Select, Badge, Person, DashTag, Empty, Confirm, Modal, Details, Pager, usePaged, useSort, presence, fmtDate, fmtDateTime, rupees, num, matches } from "../../ui.jsx";

export default function CustomerList() {
  const { db, run } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [activity, setActivity] = useState("all");
  const [city, setCity] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [open, setOpen] = useState(null);
  const now = Date.now();

  const rows = useMemo(() => {
    const stats = new Map();
    for (const o of db.orders) {
      const s = stats.get(o.customerId) || { orders: 0, spent: 0 };
      s.orders++;
      if (o.status !== "CANCELLED") s.spent += o.amount;
      stats.set(o.customerId, s);
    }
    return db.customers.map((c) => ({ ...c, ...(stats.get(c.id) || { orders: 0, spent: 0 }), presence: presence(c.lastActiveAt, now) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.customers, db.orders]);

  const cities = [...new Set(rows.map((r) => r.city))].sort();
  const filtered = rows.filter(
    (c) => (status === "all" || c.status === status) && (activity === "all" || c.presence.key === activity) && (city === "all" || c.city === city) && matches(q, c.name, c.email, c.phone, c.id)
  );
  const { sorted, th } = useSort(filtered, { key: "joined", dir: "desc" }, {
    name: (c) => c.name,
    joined: (c) => c.registeredAt,
    orders: (c) => c.orders,
    spent: (c) => c.spent,
    seen: (c) => c.lastActiveAt,
  });
  const paged = usePaged(sorted, 12, q + status + activity + city);
  const count = (k) => rows.filter((r) => r.presence.key === k && r.status === "ACTIVE").length;
  const shown = open && rows.find((c) => c.id === open);

  return (
    <section className="panel">
      <Title em="Shoppers on Vyapari" strong="Customer list" />
      <div className="dash-row filters">
        <Search value={q} onChange={setQ} placeholder="Search name, email, phone or ID" />
        <Select label="City" value={city} onChange={setCity} options={[{ id: "all", label: "All cities" }, ...cities.map((c) => ({ id: c, label: c }))]} />
        <Select
          label="Account status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "all", label: "Any status" },
            { id: "ACTIVE", label: "Active" },
            { id: "SUSPENDED", label: "Suspended" },
          ]}
        />
      </div>
      <Chips
        value={activity}
        onChange={setActivity}
        options={[
          { id: "all", label: "All activity" },
          { id: "online", label: "🟢 Online now", count: count("online") },
          { id: "today", label: "Active today", count: count("today") },
          { id: "away", label: "Inactive 24h+", count: rows.filter((r) => r.presence.key === "away").length },
        ]}
      />
      {sorted.length === 0 ? (
        <Empty icon="🔎" text="No customers match these filters." />
      ) : (
        <>
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  {th("name", "Customer")}
                  <th>Email</th>
                  <th>Contact</th>
                  {th("joined", "Registered")}
                  <th>Account</th>
                  {th("seen", "Dashboard activity")}
                  {th("orders", "Orders (45d)", "num")}
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((c) => (
                  <tr key={c.id} className={c.status !== "ACTIVE" ? "ad-row-dim" : ""}>
                    <td>
                      <Person name={c.name} sub={c.id + " · " + c.city} tone={c.presence.key === "online" && c.status === "ACTIVE" ? "live" : ""} />
                    </td>
                    <td className="ad-small">{c.email}</td>
                    <td className="ad-small">{c.phone}</td>
                    <td>{fmtDate(c.registeredAt)}</td>
                    <td>
                      <Badge status={c.status} />
                    </td>
                    <td>
                      <div className="ad-activity">
                        <DashTag type="customer" state={c.status === "ACTIVE" ? c.presence.key : "away"} />
                        <span className="muted ad-small">{c.presence.label}</span>
                      </div>
                    </td>
                    <td className="num">{c.orders}</td>
                    <td className="num">
                      <div className="ad-row-actions end">
                        <button type="button" className="link-btn" onClick={() => setOpen(c.id)}>
                          View
                        </button>
                        <button type="button" className={"link-btn" + (c.status === "ACTIVE" ? " danger" : "")} onClick={() => setConfirm(c)}>
                          {c.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                        </button>
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

      {shown && (
        <Modal title={shown.name} onClose={() => setOpen(null)} wide>
          <div className="ad-detail-head">
            <Person name={shown.name} sub={shown.id} />
            <Badge status={shown.status} />
          </div>
          <Details
            rows={[
              ["Email", shown.email],
              ["Contact", shown.phone],
              ["City / pincode", shown.city + " " + shown.pincode],
              ["Registered", fmtDateTime(shown.registeredAt)],
              ["Dashboard", <DashTag type="customer" state={shown.presence.key} />],
              ["Activity", shown.presence.label],
              ["Orders · 45 days", num(shown.orders)],
              ["Spent · 45 days", rupees(shown.spent)],
            ]}
          />
          <h3 className="ad-sub-head">Recent orders</h3>
          {db.orders.filter((o) => o.customerId === shown.id).length === 0 ? (
            <p className="dash-note left">No orders in the last 45 days.</p>
          ) : (
            <div className="ad-mini-list">
              {db.orders
                .filter((o) => o.customerId === shown.id)
                .slice(0, 8)
                .map((o) => (
                  <div key={o.id} className="ad-mini-row">
                    <b>{o.id}</b>
                    <span>{o.sellerName}</span>
                    <span className="muted">{fmtDate(o.createdAt)}</span>
                    <span>{rupees(o.amount)}</span>
                    <Badge status={o.status} />
                  </div>
                ))}
            </div>
          )}
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={confirm.status === "ACTIVE" ? "Suspend customer?" : "Reactivate customer?"}
          message={
            confirm.status === "ACTIVE" ? (
              <>
                <b>{confirm.name}</b> will not be able to log in to the Customer Dashboard or place orders until reactivated.
              </>
            ) : (
              <>
                <b>{confirm.name}</b> will be able to log in and shop again.
              </>
            )
          }
          confirm={confirm.status === "ACTIVE" ? "Suspend" : "Reactivate"}
          danger={confirm.status === "ACTIVE"}
          onConfirm={() => run(setCustomerStatus, confirm.id, confirm.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
