import { useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { addAdmin, softDeleteAdmin, restoreAdmin } from "../data/store.js";
import { ADMIN_ROLES, CURRENT_ADMIN_ID } from "../data/seed.js";
import { Title, Chips, Search, Badge, Person, StatCard, Empty, Confirm, Modal, Details, GlassButton, fmtDate, fmtDateTime, timeAgo, num, matches } from "../ui.jsx";

const ROLE_INFO = {
  "Super Admin": "Full access, including other admin accounts",
  "Operations Manager": "Sellers, delivery, orders and catalogue",
  "Support Lead": "Tickets, users and returns",
  "Finance Admin": "Refunds, settlements and revenue",
  "Catalog Manager": "Categories and listings",
};

export default function AdminManagement() {
  const { db, run } = useAdmin();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const list = db.admins.filter((a) => (filter === "all" || a.status === filter) && matches(q, a.name, a.email, a.role, a.id));
  const active = db.admins.filter((a) => a.status === "ACTIVE");
  const admin = open && db.admins.find((a) => a.id === open);
  const actions = (id) => db.log.filter((l) => l.by === db.admins.find((a) => a.id === id)?.name).length;

  return (
    <div className="dash-stack ad-stack">
      <div className="stat-grid">
        <StatCard icon="🛡️" label="Active admins" value={num(active.length)} note={active.filter((a) => a.role === "Super Admin").length + " super admin(s)"} />
        <StatCard icon="🗃️" label="Removed (kept on record)" value={num(db.admins.length - active.length)} note="Soft-deleted, can be restored" />
        <StatCard icon="🧑‍💼" label="Roles in use" value={num(new Set(active.map((a) => a.role)).size)} note={"of " + ADMIN_ROLES.length + " available roles"} />
        <StatCard icon="📝" label="Actions this session" value={num(db.log.length)} note="Recorded in the activity log" />
      </div>

      <section className="panel">
        <Title em="Who can manage Vyapari" strong="Admin accounts">
          <GlassButton variant="solid" onClick={() => setAdding(true)}>
            + Add new admin
          </GlassButton>
        </Title>
        <div className="dash-row filters">
          <Search value={q} onChange={setQ} placeholder="Search name, email, role or ID" />
        </div>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { id: "ACTIVE", label: "Active", count: active.length },
            { id: "DELETED", label: "Removed", count: db.admins.length - active.length },
            { id: "all", label: "All", count: db.admins.length },
          ]}
        />
        {list.length === 0 ? (
          <Empty icon="🔎" text="No admin accounts match." />
        ) : (
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  <th>Admin name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Date added</th>
                  <th>Last login</th>
                  <th>Account status</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className={a.status !== "ACTIVE" ? "ad-row-dim" : ""}>
                    <td>
                      <Person name={a.name} sub={a.id + (a.id === CURRENT_ADMIN_ID ? " · you" : "")} tone={a.id === CURRENT_ADMIN_ID ? "live" : ""} />
                    </td>
                    <td className="ad-small">{a.email}</td>
                    <td>
                      <span className="ad-role">{a.role}</span>
                    </td>
                    <td>{fmtDate(a.addedAt)}</td>
                    <td className="ad-small">{a.id === CURRENT_ADMIN_ID ? "Signed in now" : a.lastLoginAt ? timeAgo(a.lastLoginAt) : "Never"}</td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td className="num">
                      <div className="ad-row-actions end">
                        <button type="button" className="link-btn" onClick={() => setOpen(a.id)}>
                          View
                        </button>
                        {a.status === "ACTIVE" ? (
                          a.id !== CURRENT_ADMIN_ID && (
                            <button type="button" className="link-btn danger" onClick={() => setConfirm({ kind: "delete", a })}>
                              Remove
                            </button>
                          )
                        ) : (
                          <button type="button" className="link-btn" onClick={() => setConfirm({ kind: "restore", a })}>
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adding && <AddAdmin onClose={() => setAdding(false)} />}
      {admin && (
        <Modal title={admin.name} onClose={() => setOpen(null)}>
          <div className="ad-detail-head">
            <Person name={admin.name} sub={admin.role} />
            <Badge status={admin.status} />
          </div>
          {admin.status === "DELETED" && <p className="ad-callout bad">Removed {fmtDate(admin.deletedAt)} — {admin.deletedReason}. The account can no longer sign in.</p>}
          <Details
            rows={[
              ["Admin ID", admin.id],
              ["Email", admin.email],
              ["Phone", admin.phone || "—"],
              ["Role", admin.role],
              ["Access", ROLE_INFO[admin.role] || "—"],
              ["Date added", fmtDateTime(admin.addedAt)],
              ["Added by", admin.addedBy],
              ["Last login", admin.id === CURRENT_ADMIN_ID ? "Signed in now" : admin.lastLoginAt ? fmtDateTime(admin.lastLoginAt) : "Never signed in"],
              ["Actions logged", num(actions(admin.id))],
            ]}
          />
          <div className="ad-modal-actions">
            {admin.status === "ACTIVE" && admin.id !== CURRENT_ADMIN_ID && (
              <GlassButton className="ad-danger-btn" onClick={() => setConfirm({ kind: "delete", a: admin })}>
                Remove access
              </GlassButton>
            )}
            {admin.status === "DELETED" && (
              <GlassButton variant="solid" onClick={() => setConfirm({ kind: "restore", a: admin })}>
                Restore access
              </GlassButton>
            )}
          </div>
        </Modal>
      )}
      {confirm?.kind === "delete" && (
        <Confirm
          title="Remove this admin?"
          message={
            <>
              <b>{confirm.a.name}</b> ({confirm.a.role}) will lose access straight away. This is a soft delete — the record and its history are kept and can be restored.
            </>
          }
          confirm="Remove admin"
          danger
          reason="Reason"
          reasonPlaceholder="e.g. Left the organisation"
          onConfirm={(r) => run(softDeleteAdmin, confirm.a.id, r)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "restore" && (
        <Confirm
          title="Restore admin access?"
          message={
            <>
              <b>{confirm.a.name}</b> will be able to sign in again as <b>{confirm.a.role}</b>.
            </>
          }
          confirm="Restore"
          onConfirm={() => run(restoreAdmin, confirm.a.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function AddAdmin({ onClose }) {
  const { run } = useAdmin();
  const [f, setF] = useState({ name: "", email: "", phone: "", role: ADMIN_ROLES[1] });
  const submit = (e) => {
    e.preventDefault();
    if (run(addAdmin, f)) onClose();
  };
  return (
    <Modal title="Add new admin" onClose={onClose}>
      <form className="add-form ad-form" onSubmit={submit}>
        <label className="field">
          Full name
          <input required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Priyanka Das" autoFocus />
        </label>
        <div className="two-fields">
          <label className="field">
            Work email
            <input required type="email" maxLength={80} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@vyapari.example" />
          </label>
          <label className="field">
            Phone
            <input maxLength={16} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 98300 12345" />
          </label>
        </div>
        <div className="field">
          Role
          <div className="ad-role-pick">
            {ADMIN_ROLES.map((r) => (
              <button type="button" key={r} className={f.role === r ? "on" : ""} onClick={() => setF({ ...f, role: r })} aria-pressed={f.role === r}>
                <b>{r}</b>
                <span>{ROLE_INFO[r]}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="dash-note left ad-small">In this demo the account is added to the list straight away. With a real backend, an invite email would be sent.</p>
        <div className="ad-modal-actions">
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton type="submit" variant="solid">
            Add admin
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
