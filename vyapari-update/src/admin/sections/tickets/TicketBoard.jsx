import { useState } from "react";
import { useAdmin } from "../../AdminContext.jsx";
import { updateTicket } from "../../data/store.js";
import {
  Title, Chips, Search, Select, Badge, PriorityBadge, PRIORITY, DashTag, DASH, Empty, Confirm, Modal, Details, GlassButton, Pager, usePaged,
  fmtDate, fmtDateTime, timeAgo, matches,
} from "../../ui.jsx";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIO_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SORTS = [
  { id: "new", label: "Newest first" },
  { id: "old", label: "Oldest first" },
  { id: "prio", label: "Highest priority" },
  { id: "updated", label: "Recently updated" },
];

/*
  One ticket list, used by CustomerTickets / SellerTickets / DeliveryTickets.
  The category (customer / seller / delivery) comes from the tab; the rest are filters.
*/
export default function TicketBoard({ userType, em, title }) {
  const { db, run } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [prio, setPrio] = useState("all");
  const [topic, setTopic] = useState("all");
  const [sort, setSort] = useState("prio");
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const mine = db.tickets.filter((t) => t.userType === userType);
  const topics = [...new Set(mine.map((t) => t.topic))].sort();
  const list = mine
    .filter(
      (t) =>
        (status === "all" || (status === "active" ? t.status === "OPEN" || t.status === "IN_PROGRESS" : t.status === status)) &&
        (prio === "all" || t.priority === prio) &&
        (topic === "all" || t.topic === topic) &&
        matches(q, t.id, t.raisedBy, t.orderId)
    )
    .sort((a, b) =>
      sort === "old" ? a.createdAt.localeCompare(b.createdAt) : sort === "prio" ? PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || b.createdAt.localeCompare(a.createdAt) : sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : b.createdAt.localeCompare(a.createdAt)
    );
  const paged = usePaged(list, 10, q + status + prio + topic + sort);
  const count = (s) => mine.filter((t) => t.status === s).length;
  const ticket = open && db.tickets.find((t) => t.id === open);

  const move = (t, next) => {
    if (next === "RESOLVED" || next === "CLOSED") setConfirm({ t, next });
    else run(updateTicket, t.id, { status: next });
  };

  return (
    <section className="panel">
      <Title em={em} strong={title}>
        <DashTag type={userType} state="today" />
      </Title>
      <div className="dash-row filters">
        <Search value={q} onChange={setQ} placeholder="Search ticket ID, user name or order ID" />
        <Select label="Priority" value={prio} onChange={setPrio} options={[{ id: "all", label: "Any priority" }, ...Object.keys(PRIORITY).map((p) => ({ id: p, label: PRIORITY[p][0] + " priority" }))]} />
        <Select label="Issue type" value={topic} onChange={setTopic} options={[{ id: "all", label: "All issue types" }, ...topics.map((x) => ({ id: x, label: x }))]} />
        <Select label="Sort" value={sort} onChange={setSort} options={SORTS} />
      </div>
      <Chips
        value={status}
        onChange={setStatus}
        options={[
          { id: "active", label: "Needs action", count: count("OPEN") + count("IN_PROGRESS") },
          { id: "OPEN", label: "Open", count: count("OPEN") },
          { id: "IN_PROGRESS", label: "In progress", count: count("IN_PROGRESS") },
          { id: "RESOLVED", label: "Resolved", count: count("RESOLVED") },
          { id: "CLOSED", label: "Closed", count: count("CLOSED") },
          { id: "all", label: "All", count: mine.length },
        ]}
      />

      {list.length === 0 ? (
        <Empty icon={status === "active" && !q ? "🎉" : "🔎"} text={status === "active" && !q && prio === "all" && topic === "all" ? `No open ${DASH[userType].short.toLowerCase()} tickets right now.` : "No tickets match these filters."} />
      ) : (
        <>
          <div className="ad-ticket-list">
            {paged.slice.map((t) => (
              <article key={t.id} className={"ad-ticket p-" + t.priority.toLowerCase() + " s-" + t.status.toLowerCase()}>
                <div className="ad-ticket-main">
                  <div className="ad-ticket-top">
                    <b className="ad-ticket-id">{t.id}</b>
                    <Badge status={t.status} />
                    <PriorityBadge value={t.priority} />
                    {t.source === "live" && <span className="badge ad-live" title={"Raised in the " + DASH[t.userType].label + " on this browser"}>Live</span>}
                  </div>
                  <h3 className="ad-ticket-subject">{t.subject}</h3>
                  <p className="ad-ticket-desc">{t.description}</p>
                  <div className="ad-ticket-meta">
                    <span>👤 {t.raisedBy}</span>
                    <span>🏷️ {DASH[t.userType].short} · {t.topic}</span>
                    {t.orderId && <span>📦 {t.orderId}</span>}
                    <span title={fmtDateTime(t.createdAt)}>🗓️ {fmtDate(t.createdAt)} · {timeAgo(t.createdAt)}</span>
                  </div>
                </div>
                <div className="ad-ticket-side">
                  <label className="ad-mini-field">
                    Priority
                    <select className="select ad-inline-select ad-prio-select" value={t.priority} onChange={(e) => run(updateTicket, t.id, { priority: e.target.value })} aria-label={"Priority of " + t.id}>
                      {Object.keys(PRIORITY).map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY[p][0]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ad-ticket-btns">
                    {t.status === "OPEN" && (
                      <GlassButton className="ad-sm" onClick={() => move(t, "IN_PROGRESS")}>
                        Start
                      </GlassButton>
                    )}
                    {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                      <GlassButton className="ad-sm" variant="solid" onClick={() => move(t, "RESOLVED")}>
                        Resolve
                      </GlassButton>
                    )}
                    {t.status === "RESOLVED" && (
                      <GlassButton className="ad-sm" onClick={() => move(t, "CLOSED")}>
                        Close
                      </GlassButton>
                    )}
                    <button type="button" className="link-btn" onClick={() => setOpen(t.id)}>
                      Details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pager paged={paged} />
        </>
      )}

      {ticket && <TicketDetails t={ticket} onClose={() => setOpen(null)} onMove={move} />}
      {confirm && (
        <Confirm
          title={confirm.next === "RESOLVED" ? "Resolve ticket?" : "Close ticket?"}
          message={
            confirm.next === "RESOLVED" ? (
              <>
                <b>{confirm.t.id}</b> will be marked <b>Resolved</b> and {confirm.t.raisedBy.split(" · ")[0]} will see it as fixed.
              </>
            ) : (
              <>
                <b>{confirm.t.id}</b> will be <b>Closed</b>. Closed tickets drop out of the working queue but stay on record.
              </>
            )
          }
          confirm={confirm.next === "RESOLVED" ? "Mark resolved" : "Close ticket"}
          reason={confirm.next === "RESOLVED" ? "Resolution note" : "Closing note"}
          reasonPlaceholder={confirm.next === "RESOLVED" ? "What was done to fix it?" : "Anything to record before closing"}
          onConfirm={(note) => run(updateTicket, confirm.t.id, { status: confirm.next }, note)}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

function TicketDetails({ t, onClose, onMove }) {
  const { db, run } = useAdmin();
  const [note, setNote] = useState("");
  const order = t.orderId && db.orders.find((o) => o.id === t.orderId);
  const addNote = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    if (run(updateTicket, t.id, {}, note)) setNote("");
  };
  return (
    <Modal title={"Ticket " + t.id} onClose={onClose} wide>
      <div className="ad-detail-head">
        <div className="ad-ticket-top">
          <Badge status={t.status} />
          <PriorityBadge value={t.priority} />
          <DashTag type={t.userType} state="today" />
        </div>
        <span className="muted ad-small">Updated {timeAgo(t.updatedAt)}</span>
      </div>
      <h3 className="ad-ticket-subject big">{t.subject}</h3>
      <p className="ad-ticket-desc full">{t.description || "No description given."}</p>
      <Details
        rows={[
          ["Ticket ID", t.id],
          ["Raised by", t.raisedBy + (t.raisedById ? " (" + t.raisedById + ")" : "")],
          ["User category", DASH[t.userType].short],
          ["Issue type", t.topic],
          ["Related order", order ? `${order.id} · ${order.customerName} → ${order.sellerName} · ${order.status.replace("_", " ").toLowerCase()}` : t.orderId || "Not applicable"],
          ["Date raised", fmtDateTime(t.createdAt)],
          t.resolvedAt && ["Resolved", fmtDateTime(t.resolvedAt)],
          t.source === "live" && ["Source", "Raised in the " + DASH[t.userType].label + " on this browser"],
        ]}
      />
      <div className="ad-two-mini">
        <label className="field">
          Priority
          <select className="select ad-prio-select" value={t.priority} onChange={(e) => run(updateTicket, t.id, { priority: e.target.value })}>
            {Object.keys(PRIORITY).map((p) => (
              <option key={p} value={p}>
                {PRIORITY[p][0]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select className="select" value={t.status} onChange={(e) => onMove(t, e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "IN_PROGRESS" ? "In progress" : s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3 className="ad-sub-head">Activity & notes</h3>
      {t.notes.length === 0 ? (
        <p className="dash-note left">No updates yet.</p>
      ) : (
        <ol className="ad-timeline">
          {[...t.notes].reverse().map((n, i) => (
            <li key={i}>
              <span className="ad-tl-icon">💬</span>
              <div>
                <span>{n.text}</span>
                <small>
                  {n.by} · {fmtDateTime(n.at)}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
      <form className="ad-note-form" onSubmit={addNote}>
        <textarea rows="2" maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note or reply for the record…" aria-label="Add a note" />
        <GlassButton type="submit" className="ad-sm" disabled={!note.trim()}>
          Add note
        </GlassButton>
      </form>

      <div className="ad-modal-actions">
        {t.status === "OPEN" && <GlassButton onClick={() => onMove(t, "IN_PROGRESS")}>Mark in progress</GlassButton>}
        {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
          <GlassButton variant="solid" onClick={() => onMove(t, "RESOLVED")}>
            Resolve ticket
          </GlassButton>
        )}
        {t.status === "RESOLVED" && <GlassButton onClick={() => onMove(t, "CLOSED")}>Close ticket</GlassButton>}
        {(t.status === "RESOLVED" || t.status === "CLOSED") && <GlassButton onClick={() => onMove(t, "OPEN")}>Reopen</GlassButton>}
      </div>
    </Modal>
  );
}
