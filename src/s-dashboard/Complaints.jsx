import { useEffect, useMemo, useState } from "react";
import { storageKey, parseState } from "../customer/store.js";

const statuses = ["Submitted", "Under Review", "Resolved", "Rejected"];
const resolutions = ["Refund", "Replacement", "Return and Refund", "Repair", "Other / Custom Resolution"];
const stamp = () => new Date().toISOString();
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";

function loadComplaints() {
  try { return parseState(localStorage.getItem(storageKey) || "")?.complaints || []; }
  catch { return []; }
}

export default function Complaints() {
  const [complaints, setComplaints] = useState(loadComplaints);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [response, setResponse] = useState("");
  const [nextStatus, setNextStatus] = useState("Under Review");
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");

  const refresh = () => setComplaints(loadComplaints());
  useEffect(() => {
    const onStorage = (event) => { if (!event.key || event.key === storageKey) refresh(); };
    const onLocal = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("vyapari-customer-state", onLocal);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("vyapari-customer-state", onLocal); };
  }, []);

  const categories = [...new Set(complaints.map((c) => c.category).filter(Boolean))];
  const filtered = useMemo(() => complaints.filter((c) => {
    const text = `${c.id} ${c.product?.name || ""} ${c.orderId || ""} ${c.customerId || ""}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (statusFilter === "All" || c.status === statusFilter) && (categoryFilter === "All" || c.category === categoryFilter);
  }), [complaints, query, statusFilter, categoryFilter]);
  const selected = complaints.find((c) => c.id === selectedId);
  const sellerNotifications = (() => { try { return (parseState(localStorage.getItem(storageKey) || "")?.notifications || []).filter((n) => n.recipientId === "local" || n.recipientId === "daily").slice(0, 5); } catch { return []; } })();

  function save(update) {
    try {
      const raw = localStorage.getItem(storageKey);
      const state = parseState(raw || "");
      if (!state) throw new Error("Customer demo data could not be read. Refresh and try again.");
      const original = state.complaints.find((c) => c.id === selectedId);
      const updated = original ? update(original) : null;
      const next = { ...state, complaints: state.complaints.map((c) => c.id === selectedId ? updated : c), notifications: updated ? [{ id: `NTF-${Date.now()}`, recipientId: updated.customerId, complaintId: updated.id, message: `Seller updated complaint ${updated.id}`, date: new Date().toISOString(), read: false }, ...(state.notifications || [])] : (state.notifications || []) };
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("vyapari-customer-state"));
      setComplaints(next.complaints);
      setError("");
      return true;
    } catch (e) { setError(e.message || "Could not save this update."); return false; }
  }

  function submitResponse(event) {
    event.preventDefault();
    if (!selected) return;
    const message = response.trim();
    if (!message) { setError("Please write a response before submitting."); return; }
    if (nextStatus === "Resolved" && (!resolution || !message)) { setError("A resolution type and response are required before resolving."); return; }
    if (nextStatus === "Rejected" && message.length < 8) { setError("Please provide a clear reason for rejecting this complaint."); return; }
    const date = stamp();
    const saved = save((c) => ({
      ...c,
      status: nextStatus,
      resolutionType: resolution || c.resolutionType || "",
      resolutionRemarks: message,
      responses: [...(c.responses || []), { author: "Seller", message, date, resolutionType: resolution || "" }],
      timeline: [...(c.timeline || [{ type: "submitted", author: "Customer", message: "Complaint submitted", date: c.date }]),
        ...(c.status !== nextStatus ? [{ type: "status", author: "Seller", message: `Status changed from ${c.status} to ${nextStatus}`, date }] : []),
        { type: nextStatus === "Resolved" ? "resolution" : "response", author: "Seller", message: resolution ? `${resolution}: ${message}` : message, date }],
    }));
    if (saved) { setResponse(""); setResolution(""); setNextStatus("Under Review"); }
  }

  const count = (status) => complaints.filter((c) => status === "Total" ? true : c.status === status).length;
  return <div className="dash-stack">
    <div className="dash-row between"><div><p className="eyebrow">Customer care</p><h2>Customer Complaints.</h2><p className="muted">Review product issues, respond to customers and record resolutions.</p></div><span className="guest-tag">🧪 Demo · localStorage</span></div>
    {sellerNotifications.length > 0 && <section className="panel"><div className="dash-row between"><h3>Recent notifications</h3><span className="stat-note">{sellerNotifications.filter((n) => !n.read).length} unread</span></div>{sellerNotifications.map((n) => <div className="cu-review" key={n.id}><button className="link-btn" onClick={() => { setSelectedId(n.complaintId); setError(""); try { const st = parseState(localStorage.getItem(storageKey) || ""); if (st) { localStorage.setItem(storageKey, JSON.stringify({ ...st, notifications: (st.notifications || []).map((x) => x.id === n.id ? { ...x, read: true } : x) })); window.dispatchEvent(new Event("vyapari-customer-state")); } } catch {} }}>{n.message} →</button><time>{formatDate(n.date)}</time></div>)}</section>}
    <div className="stat-grid">
      {[['Total Complaints', count('Total')], ['New Complaints', count('Submitted')], ['Under Review', count('Under Review')], ['Resolved', count('Resolved')], ['Rejected', count('Rejected')]].map(([label, value]) => <article className="panel stat" key={label}><span className="stat-note">{label}</span><strong className="stat-value">{value}</strong></article>)}
    </div>
    <section className="panel">
      <div className="dash-row filters">
        <input className="search" aria-label="Search complaints" placeholder="Search complaint, product or order…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {filtered.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Complaint</th><th>Customer</th><th>Product / Order</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((c) => <tr key={c.id}><td><b>{c.id}</b></td><td>{c.customerName || c.customerId || "Demo customer"}</td><td>{c.product?.name || "Product"}<br/><small>{c.orderId}</small></td><td>{c.category}</td><td>{formatDate(c.date)}</td><td><span className="cu-badge">{c.status}</span></td><td><button
        className="link-btn"
        type="button"
        aria-expanded={selectedId === c.id}
        aria-controls={`complaint-details-${c.id}`}
        onClick={() => {
          // Details remain available regardless of complaint status. Toggling
          // the panel is read-only and never changes the stored complaint.
          setSelectedId((current) => current === c.id ? "" : c.id);
          setResponse("");
          setResolution(c.resolutionType || "");
          setNextStatus(c.status === "Submitted" ? "Under Review" : c.status);
          setError("");
        }}
      >{selectedId === c.id ? "Hide details ↑" : "View details →"}</button></td></tr>)}</tbody></table></div> : <p className="dash-note">No complaints match these filters. New customer complaints will appear here automatically.</p>}
    </section>
    {selected && <section id={`complaint-details-${selected.id}`} className="panel dash-stack" aria-label="Complaint details">
      <div className="dash-row between"><div><p className="eyebrow">Complaint details</p><h2>{selected.id}</h2></div><button className="link-btn" onClick={() => setSelectedId("")}>Close ×</button></div>
      <div className="two-col"><div><p><b>Customer:</b> {selected.customerName || selected.customerId || "Demo customer"}</p><p><b>Product:</b> {selected.product?.name}</p><p><b>Order:</b> {selected.orderId}</p><p><b>Category:</b> {selected.category}</p><p><b>Submitted:</b> {formatDate(selected.date)}</p><p><b>Status:</b> {selected.status}</p></div><div><p><b>Customer's description</b></p><p>{selected.description}</p></div></div>
      {!!selected.images?.length && <div><h3>Supporting images</h3><div className="cu-complaint-images">{selected.images.map((img, i) => <figure key={i}><img src={img.dataUrl} alt={img.name || `Evidence ${i+1}`} /><figcaption>{img.name}</figcaption></figure>)}</div></div>}
      <div><h3>Communication history</h3>{(selected.timeline || []).map((item, i) => <article className="cu-review" key={`${item.date}-${i}`}><b>{item.author} · {item.type}</b><time>{formatDate(item.date)}</time><p>{item.message}</p></article>)}{!(selected.timeline || []).length && <p className="muted">No updates yet.</p>}</div>
      {!['Resolved','Rejected'].includes(selected.status) && <form className="dash-stack" onSubmit={submitResponse}>
        <h3>Respond and update complaint</h3>
        <label className="field">Seller response / resolution remarks<textarea rows="4" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Explain what was reviewed and what action will be taken…" required /></label>
        <div className="dash-row"><label className="field">Update status<select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>{statuses.filter((s) => s !== 'Submitted').map((s) => <option key={s}>{s}</option>)}</select></label><label className="field">Resolution type<select value={resolution} onChange={(e) => setResolution(e.target.value)}><option value="">Select resolution (if applicable)</option>{resolutions.map((r) => <option key={r}>{r}</option>)}</select></label></div>
        {error && <p role="alert" className="error-note">{error}</p>}
        <div className="dash-row"><button className="btn btn-solid glass" type="submit">Submit response</button></div>
      </form>}
      {['Resolved','Rejected'].includes(selected.status) && <p className="muted">This complaint is closed. The communication history is retained.</p>}
    </section>}
  </div>;
}
