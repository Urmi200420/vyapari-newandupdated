import { useEffect, useMemo, useState } from "react";
import GlassButton from "../components/GlassButton.jsx";
import { Modal, fmtDate, fmtTime } from "../s-dashboard/parts.jsx";
import { formatPrice } from "../data.js";

export { Modal, fmtDate, fmtTime, formatPrice, GlassButton };

/* ---------------- formatting ---------------- */
export const rupees = (n) => formatPrice(Math.round(n));
// ₹1.53 Cr / ₹12.4 L / ₹8.2k
export const compactRupees = (n) => {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e7) return s + "₹" + (a / 1e7).toFixed(2) + " Cr";
  if (a >= 1e5) return s + "₹" + (a / 1e5).toFixed(1) + " L";
  if (a >= 1e3) return s + "₹" + (a / 1e3).toFixed(1) + "k";
  return s + "₹" + Math.round(a);
};
export const num = (n) => n.toLocaleString("en-IN");
export const fmtDateTime = (iso) => fmtDate(iso) + ", " + fmtTime(iso);
export function timeAgo(iso, now = Date.now()) {
  const m = Math.round((now - Date.parse(iso)) / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.round(h / 24);
  if (d < 30) return d + (d === 1 ? " day ago" : " days ago");
  return fmtDate(iso);
}
export const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
export const pctNote = (p, suffix = "vs previous 30 days") =>
  p === null || !isFinite(p) ? { text: "No earlier period to compare", tone: "" } : { text: (p >= 0 ? "▲ " : "▼ ") + Math.abs(p).toFixed(1) + "% " + suffix, tone: p >= 0 ? "up" : "down" };

/* ---------------- status badges ---------------- */
// tone → existing badge colours from the seller dashboard (dashboard.css), plus ad-warn / ad-info
const TONE = { new: "st-new", soft: "st-packed", green: "st-out", done: "st-done", bad: "st-cancel", ready: "st-ready", warn: "ad-warn", info: "ad-info", mute: "ad-mute" };
export const STATUS = {
  // sellers
  PENDING: ["Pending", "warn"],
  ACTIVE: ["Active", "green"],
  REJECTED: ["Rejected", "bad"],
  BLOCKED: ["Blocked", "bad"],
  // accounts
  SUSPENDED: ["Suspended", "bad"],
  INACTIVE: ["Inactive", "mute"],
  DELETED: ["Removed", "mute"],
  // courier availability
  AVAILABLE: ["Available", "green"],
  ON_DELIVERY: ["On delivery", "info"],
  OFF_DUTY: ["Off duty", "mute"],
  // orders
  CONFIRMED: ["Confirmed", "new"],
  PROCESSING: ["Processing", "soft"],
  IN_TRANSIT: ["In transit", "info"],
  DELIVERED: ["Delivered", "done"],
  CANCELLED: ["Cancelled", "bad"],
  // payments
  PAID: ["Paid", "done"],
  COD_DUE: ["COD due", "warn"],
  REFUNDED: ["Refunded", "ready"],
  PARTIAL_REFUND: ["Part refunded", "ready"],
  NOT_CHARGED: ["Not charged", "mute"],
  // tickets
  OPEN: ["Open", "warn"],
  IN_PROGRESS: ["In progress", "info"],
  RESOLVED: ["Resolved", "done"],
  CLOSED: ["Closed", "mute"],
  // refunds
  UNDER_REVIEW: ["Under review", "info"],
  APPROVED: ["Approved", "green"],
  COMPLETED: ["Completed", "done"],
};
// order PENDING reads better as "Pending" but in warn tone too
export function Badge({ status, label, tone }) {
  const [l, t] = STATUS[status] || [status, "new"];
  return <span className={"badge " + TONE[tone || t]}>{label || l}</span>;
}
export const PRIORITY = { LOW: ["Low", "mute"], MEDIUM: ["Medium", "new"], HIGH: ["High", "warn"], URGENT: ["Urgent", "bad"] };
export function PriorityBadge({ value }) {
  const [l, t] = PRIORITY[value] || [value, "new"];
  return <span className={"badge ad-prio " + TONE[t]}>{value === "URGENT" ? "● " : ""}{l}</span>;
}
export const DASH = {
  customer: { label: "Customer Dashboard", short: "Customer", icon: "🛒" },
  seller: { label: "Seller Dashboard", short: "Seller", icon: "🏪" },
  delivery: { label: "Delivery Dashboard", short: "Delivery", icon: "🛵" },
};

/* ---------------- small building blocks ---------------- */
export function Title({ em, strong, children }) {
  return (
    <div className="dash-row between ad-title-row">
      <h2 className="stack-title small">
        <em>{em}</em>
        <strong>{strong}</strong>
      </h2>
      {children && <div className="ad-title-tools">{children}</div>}
    </div>
  );
}

export function Sparkline({ values, w = 120, h = 34 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i) => (i / (values.length - 1)) * w;
  const y = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const d = values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  return (
    <svg className="ad-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d + ` L${w} ${h} L0 ${h} Z`} className="ad-spark-fill" />
      <path d={d} className="ad-spark-line" />
    </svg>
  );
}

export function StatCard({ icon, label, value, note, tone, spark, onClick, hint }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={"panel stat ad-stat" + (onClick ? " ad-clickable" : "")} onClick={onClick} type={onClick ? "button" : undefined} title={hint}>
      <div className="ad-stat-top">
        <span className="eyebrow">{label}</span>
        {icon && <span className="ad-stat-icon">{icon}</span>}
      </div>
      <b className="stat-value">{value}</b>
      <div className="ad-stat-foot">
        <span className={"stat-note " + (tone || "")}>{note}</span>
        {spark && <Sparkline values={spark} />}
      </div>
    </Tag>
  );
}

export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg ad-seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.icon && <span className="ad-seg-icon">{o.icon}</span>}
          {o.label}
          {o.count !== undefined && <span className="ad-seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} type="button" className={"chip" + (value === o.id ? " on" : "")} onClick={() => onChange(o.id)}>
          {o.label}
          {o.count !== undefined && <span className="chip-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, label }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <div className="ad-search">
      <span aria-hidden="true">⌕</span>
      <input className="search" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button type="button" className="ad-search-clear" onClick={() => onChange("")} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  );
}

export function Empty({ icon = "🍃", text, children }) {
  return (
    <div className="empty ad-empty">
      <span className="ad-empty-icon">{icon}</span>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function Avatar({ name, tone }) {
  return <span className={"ad-avatar" + (tone ? " " + tone : "")}>{initials(name)}</span>;
}

export function Person({ name, sub, tone }) {
  return (
    <div className="ad-person">
      <Avatar name={name} tone={tone} />
      <div>
        <b>{name}</b>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

export function DashTag({ type, state }) {
  const d = DASH[type];
  return (
    <span className={"ad-dash-tag " + type}>
      <span className={"ad-dot " + (state || "")} />
      {d.icon} {d.short}
    </span>
  );
}

// demo "presence" from the last-active time. Not a real session tracker.
export function presence(iso, now = Date.now()) {
  const m = (now - Date.parse(iso)) / 6e4;
  if (m < 15) return { key: "online", label: "Online now" };
  if (m < 60 * 24) return { key: "today", label: "Active " + timeAgo(iso, now) };
  return { key: "away", label: "Last seen " + timeAgo(iso, now) };
}

/* paging for long tables */
export function usePaged(rows, size = 12, resetKey) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  useEffect(() => setPage(1), [resetKey]);
  const p = Math.min(page, pages);
  return { page: p, pages, setPage, slice: rows.slice((p - 1) * size, p * size), from: rows.length ? (p - 1) * size + 1 : 0, to: Math.min(rows.length, p * size), total: rows.length };
}
export function Pager({ paged }) {
  if (paged.total === 0) return null;
  return (
    <div className="ad-pager">
      <span className="muted">
        Showing {paged.from}–{paged.to} of {num(paged.total)}
      </span>
      <div className="ad-pager-btns">
        <button type="button" className="ad-icon-btn" disabled={paged.page <= 1} onClick={() => paged.setPage(paged.page - 1)} aria-label="Previous page">
          ‹
        </button>
        <span>
          {paged.page} / {paged.pages}
        </span>
        <button type="button" className="ad-icon-btn" disabled={paged.page >= paged.pages} onClick={() => paged.setPage(paged.page + 1)} aria-label="Next page">
          ›
        </button>
      </div>
    </div>
  );
}

/* sortable table header */
export function useSort(rows, initial, getters) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const get = getters[sort.key];
    if (!get) return rows;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? c : -c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const th = (key, label, cls = "") => (
    <th className={cls + " ad-sortable" + (sort.key === key ? " on" : "")} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}>
        {label}
        <span className="ad-sort-arrow">{sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
  return { sorted, th };
}

/* detail list inside pop-ups */
export function Details({ rows }) {
  return (
    <dl className="ad-details">
      {rows
        .filter(Boolean)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/*
  Confirmation pop-up for important actions.
    <Confirm title="Block seller?" message="..." confirm="Block" danger reason="Reason" onConfirm={(reason) => ...} onClose={...} />
*/
export function Confirm({ title, message, confirm = "Confirm", danger, reason, reasonRequired, reasonPlaceholder, onConfirm, onClose }) {
  const [text, setText] = useState("");
  const blocked = reasonRequired && !text.trim();
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="ad-confirm"
        onSubmit={(e) => {
          e.preventDefault();
          if (blocked) return;
          onConfirm(text);
          onClose();
        }}
      >
        <div className={"ad-confirm-icon" + (danger ? " danger" : "")}>{danger ? "!" : "?"}</div>
        <div className="ad-confirm-msg">{message}</div>
        {reason && (
          <label className="field">
            {reason}
            {reasonRequired ? " *" : " (optional)"}
            <textarea rows="3" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder={reasonPlaceholder} autoFocus />
          </label>
        )}
        <div className="ad-modal-actions">
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton type="submit" variant="solid" className={danger ? "ad-danger-btn" : ""} disabled={blocked}>
            {confirm}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}

// simple text match across several fields
export const matches = (q, ...fields) => {
  const s = q.trim().toLowerCase();
  return !s || fields.some((f) => String(f ?? "").toLowerCase().includes(s));
};
