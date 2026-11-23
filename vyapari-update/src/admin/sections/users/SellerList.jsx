import { useState } from "react";
import { useAdmin } from "../../AdminContext.jsx";
import { Title, Chips, Search, Select, Badge, Person, DashTag, Empty, Pager, usePaged, useSort, presence, fmtDate, matches } from "../../ui.jsx";

// approval (was the application accepted?) and account (can they use the dashboard now?) are shown separately
export const approvalOf = (s) => (s.status === "PENDING" ? "PENDING" : s.status === "REJECTED" ? "REJECTED" : "APPROVED");
export const accountOf = (s) => (s.status === "ACTIVE" ? "ACTIVE" : s.status === "BLOCKED" ? "BLOCKED" : "INACTIVE");

export default function SellerList() {
  const { db } = useAdmin();
  const [q, setQ] = useState("");
  const [approval, setApproval] = useState("all");
  const [account, setAccount] = useState("all");
  const now = Date.now();

  const rows = db.sellers.map((s) => ({ ...s, approval: approvalOf(s), account: accountOf(s), presence: presence(s.lastActiveAt, now) }));
  const filtered = rows.filter((s) => (approval === "all" || s.approval === approval) && (account === "all" || s.account === account) && matches(q, s.name, s.business, s.email, s.id, s.city));
  const { sorted, th } = useSort(filtered, { key: "joined", dir: "desc" }, { name: (s) => s.name, business: (s) => s.business, joined: (s) => s.registeredAt, seen: (s) => s.lastActiveAt });
  const paged = usePaged(sorted, 12, q + approval + account);
  const n = (k, v) => rows.filter((r) => r[k] === v).length;

  return (
    <section className="panel">
      <Title em="Every merchant account" strong="Seller list" />
      <div className="dash-row filters">
        <Search value={q} onChange={setQ} placeholder="Search seller, business, email or city" />
        <Select
          label="Account status"
          value={account}
          onChange={setAccount}
          options={[
            { id: "all", label: "Any account status" },
            { id: "ACTIVE", label: "Active", count: n("account", "ACTIVE") },
            { id: "BLOCKED", label: "Blocked" },
            { id: "INACTIVE", label: "Inactive (not approved)" },
          ]}
        />
      </div>
      <Chips
        value={approval}
        onChange={setApproval}
        options={[
          { id: "all", label: "All", count: rows.length },
          { id: "APPROVED", label: "Approved", count: n("approval", "APPROVED") },
          { id: "PENDING", label: "Pending approval", count: n("approval", "PENDING") },
          { id: "REJECTED", label: "Rejected", count: n("approval", "REJECTED") },
        ]}
      />
      {sorted.length === 0 ? (
        <Empty icon="🔎" text="No sellers match these filters." />
      ) : (
        <>
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  {th("name", "Seller name")}
                  {th("business", "Business name")}
                  <th>Email</th>
                  {th("joined", "Registered")}
                  <th>Approval</th>
                  <th>Account</th>
                  {th("seen", "Dashboard activity")}
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((s) => {
                  const usable = s.account === "ACTIVE";
                  return (
                    <tr key={s.id} className={!usable ? "ad-row-dim" : ""}>
                      <td>
                        <Person name={s.name} sub={s.id} tone={usable && s.presence.key === "online" ? "live" : ""} />
                      </td>
                      <td>{s.business}</td>
                      <td className="ad-small">{s.email}</td>
                      <td>{fmtDate(s.registeredAt)}</td>
                      <td>
                        <Badge status={s.approval} label={s.approval === "APPROVED" ? "Approved" : undefined} tone={s.approval === "APPROVED" ? "done" : undefined} />
                      </td>
                      <td>
                        <Badge status={s.account} />
                      </td>
                      <td>
                        <div className="ad-activity">
                          <DashTag type="seller" state={usable ? s.presence.key : "away"} />
                          <span className="muted ad-small">{usable ? s.presence.label : s.account === "BLOCKED" ? "Access blocked" : "No dashboard access yet"}</span>
                        </div>
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
  );
}
