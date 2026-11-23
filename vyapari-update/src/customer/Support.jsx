import { useEffect, useRef, useState } from "react";
import Button from "../components/GlassButton.jsx";
import { Heading } from "./shared.jsx";
import { raiseTicket, getMyTickets, STATUS_LABEL } from "../api/tickets.js";
import { respond, askServer, shortId, CUSTOMER_CATEGORIES, STARTERS } from "./bot.js";
import "./support.css";

let nextId = 1;
const msg = (from, extra) => ({ id: nextId++, from, ...extra });
const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// the ticket form that appears inside the chat
function TicketForm({ orders, start, onSend, onCancel }) {
  const [category, setCategory] = useState(start.category);
  const [orderId, setOrderId] = useState(start.orderId);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSend({ category, orderId, details: details.trim() });
    } catch (err) {
      setError(err.message || "Could not send. Please try again.");
      setBusy(false);
    }
  }
  return (
    <form className="sp-form" onSubmit={submit}>
      <label>
        What is it about?
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CUSTOMER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>
        Which order? <span className="sp-opt">(optional)</span>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
          <option value="">Not about one order</option>
          {orders.map((o) => <option key={o.id} value={o.id}>{shortId(o.id)} · {o.status}</option>)}
        </select>
      </label>
      <label>
        Tell us what happened
        <textarea required rows="4" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="The more detail, the faster we can help." autoFocus />
      </label>
      {error && <p className="sp-error" role="alert">{error}</p>}
      <div className="sp-form-actions">
        <Button type="submit" variant="solid" disabled={busy || details.trim().length < 5}>{busy ? "Sending..." : "Send to support"}</Button>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Support({ state, notify }) {
  const orders = state.orders;
  const name = state.profile?.name || "";
  const [messages, setMessages] = useState(() => [
    msg("bot", { text: "Hi" + (name ? " " + name.split(" ")[0] : "") + "! 👋 I'm the Vyapari assistant. What do you need help with?", chips: STARTERS }),
  ]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [fallbacks, setFallbacks] = useState(0);
  const [tickets, setTickets] = useState(null);
  const log = useRef(null);

  const loadTickets = () => getMyTickets("CUSTOMER").then(setTickets).catch(() => setTickets((t) => t || []));
  useEffect(() => {
    loadTickets();
    const timer = setInterval(loadTickets, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // person says something (typed, or by tapping a button)
  async function say(text, action) {
    if (typing) return;
    // old buttons disappear once one is used
    setMessages((m) => [...m.map((x) => ({ ...x, chips: null, pick: null })), msg("me", { text })]);
    setTyping(true);
    const [served] = await Promise.all([action ? null : askServer(text, { orders, name }), new Promise((r) => setTimeout(r, 650))]);
    let reply = served || respond(text, { orders, name }, action);
    if (reply.fallback) {
      const n = fallbacks + 1;
      setFallbacks(n);
      if (n >= 2) reply = { text: "Sorry, I'm still not getting it. Let me bring in our support team.", form: { category: "Other", orderId: "" } };
    }
    setTyping(false);
    setMessages((m) => [...m, msg("bot", reply)]);
  }

  async function sendTicket(id, { category, orderId, details }) {
    const order = orders.find((o) => o.id === orderId);
    const t = await raiseTicket(
      { category, priority: "NORMAL", orderId, subject: category + (order ? " · " + shortId(order.id) : ""), message: details },
      name,
      "CUSTOMER"
    );
    setMessages((m) => [
      ...m.map((x) => (x.id === id ? { ...x, form: null, text: "Ticket sent. ✅" } : x)),
      msg("bot", { text: "Done! Your ticket " + t.ref + " is with our support team. You'll see their reply under My tickets, usually within a few hours.", chips: STARTERS.slice(0, 3) }),
    ]);
    notify?.("Ticket " + t.ref + " raised.");
    loadTickets();
  }
  const cancelForm = (id) =>
    setMessages((m) => [
      ...m.map((x) => (x.id === id ? { ...x, form: null, text: "No problem, ticket cancelled." } : x)),
      msg("bot", { text: "Is there anything else I can help with?", chips: STARTERS.slice(0, 3) }),
    ]);

  const last = messages[messages.length - 1];

  return (
    <>
      <Heading eyebrow="We're here for you">Help &amp; support.</Heading>
      <div className="sp-grid">
        <section className="cu-panel sp-chat" aria-label="Chat with the Vyapari assistant">
          <header className="sp-head">
            <span className="sp-avatar" aria-hidden="true">V</span>
            <div>
              <b>Vyapari assistant</b>
              <small>Replies instantly · Automated helper</small>
            </div>
            <Button className="sp-human" onClick={() => say("Talk to support", { intent: "human" })} disabled={typing}>🎧 Talk to support</Button>
          </header>

          <div className="sp-log" ref={log} role="log" aria-live="polite" data-lenis-prevent>
            {messages.map((m) => (
              <div key={m.id} className={"sp-row " + m.from}>
                <div className="sp-bubble">
                  {m.text && <p>{m.text}</p>}
                  {m.form && (
                    <TicketForm orders={orders} start={m.form} onSend={(f) => sendTicket(m.id, f)} onCancel={() => cancelForm(m.id)} />
                  )}
                  {m.pick && (
                    <div className="sp-chips">
                      {m.pick.orders.map((o) => (
                        <button key={o.id} type="button" className="sp-chip" onClick={() => say(shortId(o.id), { intent: m.pick.intent, orderId: o.id })}>
                          {shortId(o.id)} · {o.status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {m.chips && m === last && !typing && (
                  <div className="sp-chips">
                    {m.chips.map((c) => (
                      <button key={c.label} type="button" className="sp-chip" onClick={() => say(c.label.replace(/^[^\w]+/, ""), c.action.text ? undefined : c.action)}>{c.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="sp-row bot">
                <div className="sp-bubble sp-typing" aria-label="Assistant is typing"><i /><i /><i /></div>
              </div>
            )}
          </div>

          <form className="sp-input" onSubmit={(e) => { e.preventDefault(); const t = input.trim(); if (t) { setInput(""); say(t); } }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." maxLength={300} aria-label="Type your question" disabled={typing} />
            <Button type="submit" variant="solid" disabled={typing || !input.trim()}>Send</Button>
          </form>
        </section>

        <section className="cu-panel sp-tickets">
          <h2>My tickets</h2>
          {tickets === null && <p className="cu-muted">Loading...</p>}
          {tickets && !tickets.length && <p className="cu-muted">You haven't raised a ticket. If the assistant can't solve something, choose "Talk to support".</p>}
          <div className="sp-tlist" data-lenis-prevent>
            {(tickets || []).map((t) => (
              <article key={t.id} className="sp-ticket">
                <header>
                  <b>{t.ref}</b>
                  <span className={"sp-status " + t.status.toLowerCase()}>{STATUS_LABEL[t.status] || t.status}</span>
                </header>
                <h3>{t.subject}</h3>
                <small>{when(t.createdAt)}</small>
                <p>{t.message}</p>
                {t.adminReply && (
                  <div className="sp-reply"><small>Support replied · {when(t.updatedAt)}</small><p>{t.adminReply}</p></div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}