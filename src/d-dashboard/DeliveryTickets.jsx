import { useCallback, useEffect, useState } from "react";
import GlassButton from "../components/GlassButton.jsx";
import { raiseTicket, getMyTickets, CATEGORIES, STATUS_LABEL } from "../api/tickets.js";
import "./tickets.css";

const FILTERS = [
  ["ALL",         "All"],
  ["OPEN",        "Open"],
  ["IN_PROGRESS", "In progress"],
  ["RESOLVED",    "Resolved"],
];

// Guard CATEGORIES[0]: if the import fails for any reason, falls back to ""
const blank = {
  category: CATEGORIES?.[0] ?? "",
  priority: "NORMAL",
  orderId:  "",
  subject:  "",
  message:  "",
};

// Guard against undefined / null / invalid ISO strings so toLocaleString() never throws
const when = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d)
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "numeric", month: "short",
        hour: "numeric", minute: "2-digit",
      });
};

// <DeliveryTickets riderName="Ravi" />   riderName is optional (shown to the admin)
export default function DeliveryTickets({ riderName = "" }) {
  const [form,      setForm     ] = useState(blank);
  const [busy,      setBusy     ] = useState(false);
  const [msg,       setMsg      ] = useState({ type: "", text: "" });
  const [tickets,   setTickets  ] = useState(null);   // null = still loading
  const [filter,    setFilter   ] = useState("ALL");
  const [loadError, setLoadError] = useState("");

  // signal object passed into every async call so setState is never
  // called after the component has already unmounted
  const refresh = useCallback(async (signal) => {
    try {
      const data = await getMyTickets();
      if (!signal?.cancelled) {
        setTickets(data);
        setLoadError("");
      }
    } catch (e) {
      if (!signal?.cancelled) {
        setLoadError(e.message || "Could not load your tickets");
        setTickets((prev) => prev ?? []);
      }
    }
  }, []);

  // load immediately, then every 30 s so the admin's reply shows up
  useEffect(() => {
    const signal = { cancelled: false };
    refresh(signal);
    const timer = setInterval(() => refresh(signal), 30_000);
    return () => {
      signal.cancelled = true;
      clearInterval(timer);
    };
  }, [refresh]);

  // Functional updater avoids stale closure over `form`.
  // e.target.value is captured before the async boundary.
  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const t = await raiseTicket(
        {
          category: form.category,
          priority: form.priority,
          orderId:  form.orderId.trim(),
          subject:  form.subject.trim(),
          message:  form.message.trim(),
        },
        riderName,
      );
      setForm(blank);
      setMsg({ type: "ok", text: `Ticket ${t?.ref ?? ""} sent to the admin.` });
      await refresh(); // awaited so the list reflects the new ticket before busy clears
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not send the ticket" });
    } finally {
      setBusy(false);
    }
  }

  const shown = (tickets ?? []).filter((t) => filter === "ALL" || t.status === filter);
  const count = (s) => (tickets ?? []).filter((t) => s === "ALL" || t.status === s).length;

  return (
    <div className="tk-grid">

      {/* ── Form ─────────────────────────────────────────── */}
      <section className="tk-card">
        <h2 className="tk-title">
          <em>Something wrong on the road?</em>
          <strong>Raise a ticket</strong>
        </h2>
        <p className="tk-note">
          The Vyapari admin will see this straight away.
          For an accident or danger, call emergency services first.
        </p>

        <form onSubmit={submit} className="tk-form">

          <label className="tk-field">
            What is it about?
            <select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <fieldset className="tk-field tk-priority">
            <legend>How urgent?</legend>
            {[["NORMAL", "Normal"], ["URGENT", "Urgent"]].map(([value, label]) => (
              <label
                key={value}
                className={`tk-chip${form.priority === value ? ` on ${value.toLowerCase()}` : ""}`}
              >
                <input
                  type="radio"
                  name="priority"
                  value={value}
                  checked={form.priority === value}
                  onChange={set("priority")}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <label className="tk-field">
            <span>
              Order number <span className="tk-opt">(if it is about one order)</span>
            </span>
            <input
              value={form.orderId}
              onChange={set("orderId")}
              maxLength={40}
              placeholder="e.g. ORD-1042"
            />
          </label>

          <label className="tk-field">
            Subject
            <input
              required
              maxLength={120}
              value={form.subject}
              onChange={set("subject")}
              placeholder="e.g. Customer phone is switched off"
            />
          </label>

          <label className="tk-field">
            Details
            <textarea
              required
              rows="5"
              maxLength={1000}
              value={form.message}
              onChange={set("message")}
              placeholder="Tell the admin what happened and what you need..."
            />
            <span className="tk-count">{(form.message ?? "").length}/1000</span>
          </label>

          {msg.text && (
            <p className={`tk-msg ${msg.type}`} role="status">
              {msg.text}
            </p>
          )}

          <GlassButton type="submit" variant="solid" block disabled={busy}>
            {busy ? "Sending…" : "Send to admin"}
          </GlassButton>

        </form>
      </section>

      {/* ── Ticket list ──────────────────────────────────── */}
      <section className="tk-card">
        <h2 className="tk-title">
          <em>Track your requests</em>
          <strong>My tickets</strong>
        </h2>

        <div className="tk-filters">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`tk-filter${filter === value ? " on" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label} <span>{count(value)}</span>
            </button>
          ))}
        </div>

        {loadError && <p className="tk-msg error">{loadError}</p>}
        {tickets === null && !loadError && <p className="tk-note">Loading…</p>}
        {tickets !== null && !shown.length && !loadError && (
          <p className="tk-empty">
            {tickets.length ? "No tickets in this list." : "You have not raised any tickets yet."}
          </p>
        )}

        <div className="tk-list" data-lenis-prevent>
          {shown.map((t, index) => (
            <article key={t.id ?? t.ref ?? index} className="tk-item">
              <header>
                <b>{t.ref}</b>
                {t.priority === "URGENT" && (
                  <span className="tk-tag urgent">Urgent</span>
                )}
                {/* Optional chaining prevents crash when status is null/undefined */}
                <span className={`tk-tag status ${t.status?.toLowerCase() ?? "unknown"}`}>
                  {STATUS_LABEL[t.status] ?? t.status ?? "Unknown"}
                </span>
              </header>

              <h3>{t.subject}</h3>

              <p className="tk-meta">
                {t.category}
                {t.orderId ? ` · ${t.orderId}` : ""} · {when(t.createdAt)}
              </p>

              <p className="tk-body">{t.message}</p>

              {t.adminReply && (
                <div className="tk-reply">
                  <small>Admin replied · {when(t.updatedAt)}</small>
                  <p>{t.adminReply}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
