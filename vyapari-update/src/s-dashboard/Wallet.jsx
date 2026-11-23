import { useState, useEffect } from "react";
import { getWallet, requestWithdrawal, getProfile } from "../api";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import { useAsync, Loading, ErrorNote, fmtDate, fmtTime } from "./parts.jsx";

const PAGE = 12;
const TXN_BADGE = {
  COMPLETED: ["Credited", "st-done"],
  PENDING: ["Pending", "st-packed"],
  APPROVED: ["Paid out", "st-done"],
  REJECTED: ["Rejected", "st-cancel"],
};

export default function Wallet() {
  const { data, error, loading, reload } = useAsync(getWallet);
  const { data: profile } = useAsync(getProfile);
  const [amount, setAmount] = useState("");
  const [payTo, setPayTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filter, setFilter] = useState("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!payTo && profile?.bank?.accountNumber) {
      setPayTo(profile.bank.bankName + " (A/C: " + profile.bank.accountNumber + ", IFSC: " + profile.bank.ifscCode + ")");
    }
  }, [profile, payTo]);

  if (error && !data) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading your wallet..." />;

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    const n = Number(amount);
    if (!(n >= data.minWithdrawal)) return setMsg({ type: "error", text: "The minimum withdrawal is " + formatPrice(data.minWithdrawal) + "." });
    if (n > data.balance) return setMsg({ type: "error", text: "That is more than your available balance (" + formatPrice(data.balance) + ")." });
    setBusy(true);
    try {
      await requestWithdrawal({ amount: n, payTo: payTo.trim() });
      setAmount("");
      setMsg({ type: "ok", text: "Request for " + formatPrice(n) + " sent. The admin will review it and the money will be sent to " + payTo.trim() + "." });
      reload();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not send the request" });
    } finally {
      setBusy(false);
    }
  };

  const rows = data.transactions.filter((t) => filter === "all" || (filter === "credit" ? t.type === "CREDIT" : t.type === "DEBIT"));

  return (
    <div className={"dash-stack" + (loading ? " is-loading" : "")}>
      <div className="stat-grid">
        <div className="panel stat balance-card">
          <span className="eyebrow">Available balance</span>
          <b className="stat-value">{formatPrice(data.balance)}</b>
          <span className="stat-note">You can withdraw this</span>
        </div>
        <div className="panel stat">
          <span className="eyebrow">Withdrawals pending</span>
          <b className="stat-value">{formatPrice(data.pendingWithdrawals)}</b>
          <span className="stat-note">Waiting for admin approval</span>
        </div>
        <div className="panel stat">
          <span className="eyebrow">Total earned</span>
          <b className="stat-value">{formatPrice(data.totalEarned)}</b>
          <span className="stat-note">After the {data.commissionPct}% platform fee</span>
        </div>
        <div className="panel stat">
          <span className="eyebrow">Total paid out</span>
          <b className="stat-value">{formatPrice(data.totalWithdrawn)}</b>
          <span className="stat-note">Sent to you so far</span>
        </div>
      </div>

      <div className="two-col wallet-cols">
        <section className="panel">
          <h2 className="stack-title small">
            <em>Take your money</em>
            <strong>Withdraw</strong>
          </h2>
          <form onSubmit={submit} className="add-form">
            <label className="field">
              Amount (₹)
              <input required type="number" step="1" value={amount} onChange={(e) => { setAmount(e.target.value); setMsg({ type: "", text: "" }); }} placeholder={"Minimum " + data.minWithdrawal} />
            </label>
            <div className="quick-amounts">
              {[25, 50, 100].map((p) => (
                <button type="button" key={p} className="chip" onClick={() => { setAmount(String(Math.floor((data.balance * p) / 100))); setMsg({ type: "", text: "" }); }}>
                  {p === 100 ? "All" : p + "%"}
                </button>
              ))}
            </div>
            <label className="field">
              Send money to (UPI ID or bank account)
              <input required maxLength={80} value={payTo} onChange={(e) => setPayTo(e.target.value)} placeholder="e.g. yourshop@upi" />
              {profile?.bank?.accountNumber && (
                <button
                  type="button"
                  className="link-btn"
                  style={{ alignSelf: "flex-start", marginTop: "0.25rem", fontSize: "0.75rem" }}
                  onClick={() =>
                    setPayTo(
                      profile.bank.bankName + " (A/C: " + profile.bank.accountNumber + ", IFSC: " + profile.bank.ifscCode + ")"
                    )
                  }
                >
                  Use registered bank: {profile.bank.bankName} (..{profile.bank.accountNumber.slice(-4)})
                </button>
              )}
            </label>
            {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}
            <GlassButton type="submit" variant="solid" block disabled={busy || data.balance < data.minWithdrawal}>
              {busy ? "Sending request..." : "Request withdrawal"}
            </GlassButton>
            <p className="dash-note left">Withdrawals are reviewed by the Vyapari admin. Money for a pending request is set aside from your balance straight away.</p>
          </form>
        </section>

        <section className="panel">
          <div className="dash-row between">
            <h2 className="stack-title small">
              <em>Every rupee in and out</em>
              <strong>Passbook</strong>
            </h2>
            <select className="select" value={filter} onChange={(e) => { setFilter(e.target.value); setShown(PAGE); }} aria-label="Filter passbook">
              <option value="all">All entries</option>
              <option value="credit">Money in</option>
              <option value="debit">Withdrawals</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <p className="dash-note">No entries yet.</p>
          ) : (
            <div className="table-wrap" data-lenis-prevent-wheel>
              <table className="table passbook">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Details</th>
                    <th className="num">Money in</th>
                    <th className="num">Money out</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, shown).map((t) => {
                    const [label, cls] = TXN_BADGE[t.status] || [t.status, "st-new"];
                    return (
                      <tr key={t.id}>
                        <td>
                          {fmtDate(t.date)}
                          <br />
                          <span className="muted">{fmtTime(t.date)}</span>
                        </td>
                        <td className="items-cell">
                          {t.description}
                          <br />
                          {t.type === "DEBIT" && <span className={"badge " + cls}>{label}</span>}
                        </td>
                        <td className="num pos">{t.type === "CREDIT" ? formatPrice(t.amount) : ""}</td>
                        <td className={"num neg" + (t.status === "REJECTED" ? " struck" : "")}>{t.type === "DEBIT" ? formatPrice(t.amount) : ""}</td>
                        <td className="num">{formatPrice(t.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > shown && (
            <div className="dash-row center">
              <GlassButton onClick={() => setShown(shown + PAGE)}>Show more ({rows.length - shown} left)</GlassButton>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}