import { useState } from "react";
import { sendTicket } from "../api/index.js";
import GlassButton from "../components/GlassButton.jsx";

export default function Support() {
  const [ticket, setTicket] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await sendTicket(ticket.subject.trim(), ticket.message.trim());
      setTicket({ subject: "", message: "" });
      setMsg({ type: "ok", text: "Sent to the Vyapari admin. They will get back to you." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not send your message" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel narrow">
      <h2 className="stack-title small">
        <em>Need a hand?</em>
        <strong>Contact admin</strong>
      </h2>
      <p className="dash-note left">Raise a ticket about payouts, store listings or delivery assignments.</p>

      <form onSubmit={submit} className="add-form">
        <label className="field">
          Subject
          <input required maxLength={120} value={ticket.subject} onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} placeholder="e.g. Payout delay for order ORD-1042" />
        </label>
        <label className="field">
          Message
          <textarea required rows="5" maxLength={2000} value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })} placeholder="Describe the issue clearly..." />
        </label>
        {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}
        <GlassButton type="submit" variant="solid" block disabled={busy}>
          {busy ? "Sending..." : "Send to admin"}
        </GlassButton>
      </form>
    </section>
  );
}