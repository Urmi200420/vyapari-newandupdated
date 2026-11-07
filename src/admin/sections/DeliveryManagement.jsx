import { useMemo, useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { addCourier, setCourierStatus, setCourierAvailability, assignOrder, unassignOrder } from "../data/store.js";
import { AREAS, areaOf } from "../data/seed.js";
import {
  Title, Seg, Chips, Search, Select, Badge, Person, Empty, Confirm, Modal, Details, GlassButton,
  fmtDate, fmtDateTime, timeAgo, rupees, num, matches,
} from "../ui.jsx";

const ACTIVE_JOB = ["CONFIRMED", "PROCESSING", "IN_TRANSIT"];
const pinLabel = (p) => p + " · " + areaOf(p).area;

export default function DeliveryManagement({ view, setView }) {
  const { db } = useAdmin();
  const tab = view === "assign" ? "assign" : "team";
  const [registering, setRegistering] = useState(false);
  const waiting = db.orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status) && !o.deliveryPersonId).length;

  return (
    <div className="dash-stack ad-stack">
      <div className="dash-row between">
        <Seg
          label="Delivery views"
          value={tab}
          onChange={setView}
          options={[
            { id: "team", icon: "🛵", label: "Delivery team", count: db.delivery.length },
            { id: "assign", icon: "📍", label: "Assign orders", count: waiting },
          ]}
        />
        <GlassButton variant="solid" onClick={() => setRegistering(true)}>
          + Register delivery partner
        </GlassButton>
      </div>
      {tab === "team" ? <Team /> : <Assign />}
      {registering && <RegisterCourier onClose={() => setRegistering(false)} />}
    </div>
  );
}

/* ---------------- team list ---------------- */
function Team() {
  const { db, run } = useAdmin();
  const [q, setQ] = useState("");
  const [pin, setPin] = useState("all");
  const [avail, setAvail] = useState("all");
  const [status, setStatus] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [ordersOf, setOrdersOf] = useState(null);

  const pins = useMemo(() => [...new Set(db.delivery.flatMap((d) => d.pincodes))].sort(), [db.delivery]);
  const jobs = (id) => db.orders.filter((o) => o.deliveryPersonId === id && ACTIVE_JOB.includes(o.status));
  const list = db.delivery.filter(
    (d) =>
      (pin === "all" || d.pincodes.includes(pin)) &&
      (avail === "all" || d.availability === avail) &&
      (status === "all" || d.status === status) &&
      matches(q, d.name, d.email, d.phone, d.id, d.vehicle, d.pincodes.join(" "))
  );
  const count = (k, v) => db.delivery.filter((d) => d[k] === v).length;
  const person = ordersOf && db.delivery.find((d) => d.id === ordersOf);

  return (
    <section className="panel">
      <Title em="Everyone who delivers for Vyapari" strong="Delivery personnel">
        <span className="pill">
          {count("availability", "AVAILABLE")} available · {count("availability", "ON_DELIVERY")} on delivery
        </span>
      </Title>
      <div className="dash-row filters">
        <Search value={q} onChange={setQ} placeholder="Search name, phone, vehicle or pincode" />
        <Select label="Filter by pincode" value={pin} onChange={setPin} options={[{ id: "all", label: "All pincodes" }, ...pins.map((p) => ({ id: p, label: pinLabel(p) }))]} />
        <Select
          label="Filter by account status"
          value={status}
          onChange={setStatus}
          options={[
            { id: "all", label: "Any status" },
            { id: "ACTIVE", label: "Active accounts" },
            { id: "INACTIVE", label: "Inactive accounts" },
          ]}
        />
      </div>
      <Chips
        value={avail}
        onChange={setAvail}
        options={[
          { id: "all", label: "All", count: db.delivery.length },
          { id: "AVAILABLE", label: "Available", count: count("availability", "AVAILABLE") },
          { id: "ON_DELIVERY", label: "On delivery", count: count("availability", "ON_DELIVERY") },
          { id: "OFF_DUTY", label: "Off duty", count: count("availability", "OFF_DUTY") },
        ]}
      />
      {list.length === 0 ? (
        <Empty icon="🔎" text="No delivery partners match these filters." />
      ) : (
        <div className="ad-courier-grid">
          {list.map((d) => {
            const j = jobs(d.id);
            return (
              <article key={d.id} className={"ad-courier" + (d.status === "INACTIVE" ? " off" : "")}>
                <div className="ad-app-head">
                  <Person name={d.name} sub={d.id + " · " + d.city} tone={d.availability === "AVAILABLE" && d.status === "ACTIVE" ? "live" : ""} />
                  <Badge status={d.status} />
                </div>
                <div className="ad-courier-meta">
                  <span>📞 {d.phone}</span>
                  <span>✉️ {d.email}</span>
                  <span>🏍️ {d.vehicle}</span>
                </div>
                <div className="ad-pins">
                  {d.pincodes.map((p) => (
                    <span key={p} className={"ad-pin" + (p === pin ? " on" : "")} title={areaOf(p).area + ", " + areaOf(p).city}>
                      {p}
                    </span>
                  ))}
                </div>
                <div className="ad-courier-row">
                  <div>
                    <span className="eyebrow">Availability</span>
                    {d.status === "ACTIVE" ? (
                      <select className="select ad-inline-select" value={d.availability} onChange={(e) => run(setCourierAvailability, d.id, e.target.value)} aria-label={"Availability of " + d.name}>
                        <option value="AVAILABLE">Available</option>
                        <option value="ON_DELIVERY">On delivery</option>
                        <option value="OFF_DUTY">Off duty</option>
                      </select>
                    ) : (
                      <Badge status="OFF_DUTY" />
                    )}
                  </div>
                  <div>
                    <span className="eyebrow">Active jobs</span>
                    <b>{j.length} order{j.length === 1 ? "" : "s"}</b>
                  </div>
                  <div>
                    <span className="eyebrow">Rating</span>
                    <b>{d.rating ? "★ " + d.rating.toFixed(1) : "New"}</b>
                  </div>
                </div>
                <div className="ad-app-actions">
                  <GlassButton className="ad-sm" onClick={() => setOrdersOf(d.id)}>
                    View orders
                  </GlassButton>
                  {d.status === "ACTIVE" ? (
                    <button type="button" className="link-btn danger" onClick={() => setConfirm({ kind: "INACTIVE", d })}>
                      Deactivate
                    </button>
                  ) : (
                    <button type="button" className="link-btn" onClick={() => setConfirm({ kind: "ACTIVE", d })}>
                      Activate
                    </button>
                  )}
                  <span className="muted ad-small">Seen {timeAgo(d.lastActiveAt)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {person && <CourierOrders d={person} onClose={() => setOrdersOf(null)} />}
      {confirm && (
        <Confirm
          title={confirm.kind === "ACTIVE" ? "Activate delivery partner?" : "Deactivate delivery partner?"}
          message={
            confirm.kind === "ACTIVE" ? (
              <>
                <b>{confirm.d.name}</b> can log in again and will be offered orders in {confirm.d.pincodes.join(", ")}.
              </>
            ) : (
              <>
                <b>{confirm.d.name}</b> will be logged out of the delivery dashboard and will not receive new orders.
              </>
            )
          }
          confirm={confirm.kind === "ACTIVE" ? "Activate" : "Deactivate"}
          danger={confirm.kind === "INACTIVE"}
          onConfirm={() => run(setCourierStatus, confirm.d.id, confirm.kind)}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

function CourierOrders({ d, onClose }) {
  const { db } = useAdmin();
  const mine = db.orders.filter((o) => o.deliveryPersonId === d.id);
  const now = mine.filter((o) => ACTIVE_JOB.includes(o.status));
  const done = mine.filter((o) => o.status === "DELIVERED");
  return (
    <Modal title={"Orders · " + d.name} onClose={onClose} wide>
      <Details
        rows={[
          ["Delivery partner", d.name + " (" + d.id + ")"],
          ["Serviceable pincodes", d.pincodes.map(pinLabel).join(", ")],
          ["Registered", fmtDate(d.registeredAt)],
          ["Lifetime deliveries", num(d.lifetimeDeliveries + done.length)],
        ]}
      />
      <h3 className="ad-sub-head">Assigned now ({now.length})</h3>
      <OrderMiniList orders={now} empty="Nothing assigned right now." />
      <h3 className="ad-sub-head">Delivered in the last 45 days ({done.length})</h3>
      <OrderMiniList orders={done.slice(0, 15)} empty="No deliveries yet." />
    </Modal>
  );
}

function OrderMiniList({ orders, empty }) {
  if (!orders.length) return <p className="dash-note left">{empty}</p>;
  return (
    <div className="ad-mini-list">
      {orders.map((o) => (
        <div key={o.id} className="ad-mini-row">
          <b>{o.id}</b>
          <span>{o.customerName} · {o.address}</span>
          <span className="muted">{fmtDate(o.createdAt)}</span>
          <span>{rupees(o.amount)}</span>
          <Badge status={o.status} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- assignment ---------------- */
function Assign() {
  const { db, run } = useAdmin();
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [pinFilter, setPinFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);

  const queue = db.orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status) && !o.deliveryPersonId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const queuePins = [...new Set(queue.map((o) => o.pincode))].sort();
  const visibleQueue = queue.filter((o) => pinFilter === "all" || o.pincode === pinFilter);
  const order = db.orders.find((o) => o.id === selected) || null;
  const pickedUp = order && order.deliveryPersonId;
  const load = (id) => db.orders.filter((o) => o.deliveryPersonId === id && ACTIVE_JOB.includes(o.status)).length;

  const candidates = order
    ? db.delivery
        .filter((d) => d.status === "ACTIVE")
        .map((d) => ({ ...d, match: d.pincodes.includes(order.pincode), load: load(d.id) }))
        .filter((d) => showAll || d.match)
        .sort((a, b) => b.match - a.match || (a.availability === "AVAILABLE" ? -1 : 1) - (b.availability === "AVAILABLE" ? -1 : 1) || a.load - b.load)
    : [];
  const assigned = db.orders.filter((o) => o.deliveryPersonId && ACTIVE_JOB.includes(o.status)).sort((a, b) => {
    const at = (x) => [...x.timeline].reverse().find((t) => t.status === "ASSIGNED")?.at || x.createdAt;
    return at(b).localeCompare(at(a));
  });

  return (
    <>
      <div className="ad-assign">
        <section className="panel">
          <Title em="Step 1 · choose an order" strong="Awaiting a courier">
            <Select label="Filter queue by pincode" value={pinFilter} onChange={setPinFilter} options={[{ id: "all", label: "All pincodes" }, ...queuePins.map((p) => ({ id: p, label: pinLabel(p) }))]} />
          </Title>
          {visibleQueue.length === 0 ? (
            <Empty icon="✅" text="Every confirmed order has a delivery partner." />
          ) : (
            <div className="ad-queue" data-lenis-prevent>
              {visibleQueue.map((o) => (
                <button key={o.id} type="button" className={"ad-queue-item" + (selected === o.id ? " on" : "")} onClick={() => setSelected(o.id)}>
                  <div className="ad-queue-top">
                    <b>{o.id}</b>
                    <Badge status={o.status} />
                  </div>
                  <span>{o.customerName} · {rupees(o.amount)} · {o.method}</span>
                  <span className="ad-queue-pin">📍 {o.pincode} · {areaOf(o.pincode).area}, {areaOf(o.pincode).city}</span>
                  <span className="muted">From {o.sellerName} · placed {timeAgo(o.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <Title em="Step 2 · match by pincode" strong="Available couriers" />
          {!order ? (
            <Empty icon="👈" text="Pick an order on the left to see delivery partners who serve its pincode." />
          ) : pickedUp ? (
            <AssignedCard order={order} db={db} onUnassign={() => run(unassignOrder, order.id)} />
          ) : (
            <>
              <div className="ad-callout">
                <b>{order.id}</b> → {order.address}
                <br />
                <span className="muted">{order.items.map((i) => i.qty + " × " + i.name).join(", ")}</span>
              </div>
              <label className="ad-toggle">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                <span className="ad-toggle-ui" />
                Also show couriers outside {order.pincode}
              </label>
              {candidates.length === 0 ? (
                <Empty icon="📭" text={`No active delivery partner serves ${order.pincode}. Turn on the switch above or register one for this area.`} />
              ) : (
                <div className="ad-cand-list">
                  {candidates.map((d) => {
                    const off = d.availability === "OFF_DUTY";
                    return (
                      <div key={d.id} className={"ad-cand" + (d.match ? " match" : "") + (off ? " off" : "")}>
                        <Person name={d.name} sub={d.vehicle} tone={d.availability === "AVAILABLE" ? "live" : ""} />
                        <div className="ad-cand-info">
                          <Badge status={d.availability} />
                          <span className={"ad-match " + (d.match ? "yes" : "no")}>{d.match ? "✓ Serves " + order.pincode : "Outside area"}</span>
                          <span className="muted ad-small">{d.load} active order{d.load === 1 ? "" : "s"}</span>
                        </div>
                        <GlassButton className="ad-sm" variant={d.match && !off ? "solid" : "glass"} disabled={off} onClick={() => setConfirm({ order, d })} title={off ? "Off duty" : ""}>
                          {off ? "Off duty" : "Assign"}
                        </GlassButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="panel">
        <Title em="Step 3 · track" strong="Assigned & on the way">
          <span className="pill">{assigned.length} active assignments</span>
        </Title>
        {assigned.length === 0 ? (
          <Empty text="No orders are assigned yet." />
        ) : (
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Deliver to</th>
                  <th>Delivery partner</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {assigned.slice(0, 25).map((o) => {
                  const d = db.delivery.find((x) => x.id === o.deliveryPersonId);
                  return (
                    <tr key={o.id}>
                      <td>
                        <b>{o.id}</b>
                        <br />
                        <span className="muted ad-small">{o.customerName} · {rupees(o.amount)}</span>
                      </td>
                      <td className="ad-small">{o.address}</td>
                      <td>{d ? <Person name={d.name} sub={d.vehicle} /> : "—"}</td>
                      <td className="ad-small">{d?.phone}</td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                      <td className="num">
                        {o.status === "IN_TRANSIT" ? (
                          <span className="muted ad-small">Picked up</span>
                        ) : (
                          <button type="button" className="link-btn danger" onClick={() => run(unassignOrder, o.id)}>
                            Unassign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <Confirm
          title="Assign this order?"
          message={
            <>
              <b>{confirm.order.id}</b> ({confirm.order.address}) will be assigned to <b>{confirm.d.name}</b>.
              {!confirm.d.match && <span className="ad-quote">Heads up: {confirm.d.name} does not normally serve {confirm.order.pincode}.</span>}
            </>
          }
          confirm="Assign"
          onConfirm={() => run(assignOrder, confirm.order.id, confirm.d.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function AssignedCard({ order, db, onUnassign }) {
  const d = db.delivery.find((x) => x.id === order.deliveryPersonId);
  const at = [...order.timeline].reverse().find((t) => t.status === "ASSIGNED")?.at;
  return (
    <div className="ad-assigned">
      <p className="form-msg ok">✓ {order.id} is assigned.</p>
      <Details
        rows={[
          ["Delivery partner", d ? d.name + " (" + d.id + ")" : "—"],
          ["Phone", d?.phone],
          ["Vehicle", d?.vehicle],
          ["Serves", d?.pincodes.join(", ")],
          ["Deliver to", order.address],
          ["Assigned", at ? fmtDateTime(at) : "—"],
        ]}
      />
      {order.status !== "IN_TRANSIT" && (
        <GlassButton className="ad-sm" onClick={onUnassign}>
          Unassign
        </GlassButton>
      )}
    </div>
  );
}

/* ---------------- register ---------------- */
function RegisterCourier({ onClose }) {
  const { run } = useAdmin();
  const [f, setF] = useState({ name: "", email: "", phone: "", vehicle: "", pincodes: [] });
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const togglePin = (p) => setF((x) => ({ ...x, pincodes: x.pincodes.includes(p) ? x.pincodes.filter((y) => y !== p) : [...x.pincodes, p] }));
  const addExtra = () => {
    const p = extra.trim();
    if (!/^\d{6}$/.test(p)) return setError("A pincode has exactly 6 digits.");
    if (!f.pincodes.includes(p)) togglePin(p);
    setExtra("");
    setError("");
  };
  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!/^[+\d][\d\s-]{9,15}$/.test(f.phone.trim())) return setError("Enter a valid phone number.");
    if (!f.pincodes.length) return setError("Pick at least one serviceable pincode.");
    if (run(addCourier, f)) onClose();
  };
  const cities = [...new Set(AREAS.map((a) => a.city))];

  return (
    <Modal title="Register delivery partner" onClose={onClose} wide>
      <form className="add-form ad-form" onSubmit={submit}>
        <div className="two-fields">
          <label className="field">
            Full name
            <input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rakesh Mondal" autoFocus />
          </label>
          <label className="field">
            Email
            <input required type="email" maxLength={80} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@vyapari.example" />
          </label>
          <label className="field">
            Contact number
            <input required maxLength={16} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98300 12345" />
          </label>
          <label className="field">
            Vehicle
            <input required maxLength={60} value={f.vehicle} onChange={(e) => setF({ ...f, vehicle: e.target.value })} placeholder="e.g. Honda Activa · WB-02-1234" />
          </label>
        </div>
        <div className="field">
          Serviceable pincodes · {f.pincodes.length} selected
          {cities.map((c) => (
            <div key={c} className="ad-pin-pick">
              <span className="muted">{c}</span>
              <div className="ad-pins">
                {AREAS.filter((a) => a.city === c).map((a) => (
                  <button type="button" key={a.pincode} className={"ad-pin btn-like" + (f.pincodes.includes(a.pincode) ? " on" : "")} onClick={() => togglePin(a.pincode)} title={a.area}>
                    {a.pincode} <small>{a.area}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="ad-inline-add">
            <input inputMode="numeric" maxLength={6} value={extra} onChange={(e) => setExtra(e.target.value.replace(/\D/g, ""))} placeholder="Other pincode" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExtra())} />
            <GlassButton className="ad-sm" onClick={addExtra}>
              Add
            </GlassButton>
          </div>
          {f.pincodes.filter((p) => !AREAS.some((a) => a.pincode === p)).length > 0 && (
            <div className="ad-pins">
              {f.pincodes
                .filter((p) => !AREAS.some((a) => a.pincode === p))
                .map((p) => (
                  <button type="button" key={p} className="ad-pin btn-like on" onClick={() => togglePin(p)} title="Remove">
                    {p} ✕
                  </button>
                ))}
            </div>
          )}
        </div>
        {error && <p className="form-msg error">{error}</p>}
        <div className="ad-modal-actions">
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton type="submit" variant="solid">
            Register partner
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
