import { useState } from "react";
import { useAdmin } from "../../AdminContext.jsx";
import { areaOf } from "../../data/seed.js";
import { Title, Chips, Search, Select, Badge, Person, DashTag, Empty, Pager, usePaged, useSort, presence, fmtDate, matches } from "../../ui.jsx";

export default function DeliveryList() {
  const { db } = useAdmin();
  const [q, setQ] = useState("");
  const [avail, setAvail] = useState("all");
  const [account, setAccount] = useState("all");
  const now = Date.now();

  const rows = db.delivery.map((d) => ({ ...d, presence: presence(d.lastActiveAt, now) }));
  const filtered = rows.filter((d) => (avail === "all" || d.availability === avail) && (account === "all" || d.status === account) && matches(q, d.name, d.email, d.phone, d.id, d.pincodes.join(" ")));
  const { sorted, th } = useSort(filtered, { key: "name", dir: "asc" }, { name: (d) => d.name, joined: (d) => d.registeredAt, seen: (d) => d.lastActiveAt });
  const paged = usePaged(sorted, 12, q + avail + account);
  const n = (v) => rows.filter((r) => r.availability === v).length;

  return (
    <section className="panel">
      <Title em="Every courier account" strong="Delivery personnel list" />
      <div className="dash-row filters">
        <Search value={q} onChange={setQ} placeholder="Search name, email, phone or pincode" />
        <Select
          label="Account status"
          value={account}
          onChange={setAccount}
          options={[
            { id: "all", label: "Any account status" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
          ]}
        />
      </div>
      <Chips
        value={avail}
        onChange={setAvail}
        options={[
          { id: "all", label: "All", count: rows.length },
          { id: "AVAILABLE", label: "Available", count: n("AVAILABLE") },
          { id: "ON_DELIVERY", label: "On delivery", count: n("ON_DELIVERY") },
          { id: "OFF_DUTY", label: "Off duty", count: n("OFF_DUTY") },
        ]}
      />
      {sorted.length === 0 ? (
        <Empty icon="🔎" text="No delivery personnel match these filters." />
      ) : (
        <>
          <div className="table-wrap" data-lenis-prevent-wheel>
            <table className="table ad-table">
              <thead>
                <tr>
                  {th("name", "Name")}
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Serviceable pincodes</th>
                  <th>Availability</th>
                  <th>Account</th>
                  {th("seen", "Dashboard activity")}
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((d) => {
                  const usable = d.status === "ACTIVE";
                  return (
                    <tr key={d.id} className={!usable ? "ad-row-dim" : ""}>
                      <td>
                        <Person name={d.name} sub={d.id + " · since " + fmtDate(d.registeredAt)} tone={usable && d.presence.key === "online" ? "live" : ""} />
                      </td>
                      <td className="ad-small">{d.email}</td>
                      <td className="ad-small">{d.phone}</td>
                      <td>
                        <div className="ad-pins">
                          {d.pincodes.map((p) => (
                            <span key={p} className="ad-pin" title={areaOf(p).area + ", " + areaOf(p).city}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <Badge status={d.availability} />
                      </td>
                      <td>
                        <Badge status={d.status} />
                      </td>
                      <td>
                        <div className="ad-activity">
                          <DashTag type="delivery" state={usable ? d.presence.key : "away"} />
                          <span className="muted ad-small">{usable ? d.presence.label : "Access disabled"}</span>
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
