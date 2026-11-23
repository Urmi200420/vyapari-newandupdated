import { useState } from "react";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import { fmtDate, fmtTime } from "../s-dashboard/parts.jsx";

const TXN_BADGE = {
  COMPLETED: ["Credited", "st-done"],
  PENDING: ["Pending Approval", "st-packed"],
  APPROVED: ["Paid Out", "st-done"],
  REJECTED: ["Rejected", "st-cancel"],
};

export default function DeliveryWallet({ wallet, onWithdraw, agent, reload }) {
  const [amount, setAmount] = useState("");
  const [payTo, setPayTo] = useState(
    agent?.bankName && agent?.accountNumber
      ? `${agent.bankName} (A/C: ${agent.accountNumber}, IFSC: ${agent.ifscCode})`
      : "driver@upi"
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  if (!wallet) return <p className="dash-note">Loading wallet...</p>;

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    const n = Number(amount);
    if (!(n >= wallet.minWithdrawal)) {
      return setMsg({ type: "error", text: `The minimum withdrawal is ${formatPrice(wallet.minWithdrawal)}.` });
    }
    if (n > wallet.balance) {
      return setMsg({ type: "error", text: `Requested amount exceeds available balance (${formatPrice(wallet.balance)}).` });
    }
    setBusy(true);
    try {
      await onWithdraw({ amount: n, payTo: payTo.trim() });
      setAmount("");
      setMsg({
        type: "ok",
        text: `Withdrawal request for ${formatPrice(n)} submitted! Admin will transfer funds to ${payTo.trim()}.`,
      });
      reload();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to submit withdrawal request." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-stack">
      {/* Wallet Balance Hero Banner */}
      <div className="delivery-balance-hero">
        <div>
          <span className="eyebrow">Courier Available Earnings</span>
          <div className="bal-num">{formatPrice(wallet.balance)}</div>
          <span className="stat-note" style={{ color: "#86efac" }}>
            Earning Rate: ₹{wallet.ratePerDelivery} per delivered package
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="snapshot-box">
            <span className="snap-label">Total Delivered</span>
            <strong className="snap-value">{wallet.totalDelivered} Trips</strong>
          </div>
          <div className="snapshot-box">
            <span className="snap-label">Total Withdrawn</span>
            <strong className="snap-value">{formatPrice(wallet.totalWithdrawn)}</strong>
          </div>
        </div>
      </div>

      <div className="two-col wallet-cols">
        {/* Withdraw Panel */}
        <section className="panel">
          <h2 className="stack-title small">
            <em>Payout request</em>
            <strong>Withdraw Earnings</strong>
          </h2>
          <form onSubmit={submit} className="add-form">
            <label className="field">
              Amount (₹)
              <input
                required
                type="number"
                min={wallet.minWithdrawal}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={"Minimum ₹" + wallet.minWithdrawal}
              />
            </label>

            <div className="chips">
              {[25, 50, 100].map((p) => (
                <button
                  type="button"
                  key={p}
                  className="chip"
                  onClick={() => setAmount(String(Math.floor((wallet.balance * p) / 100)))}
                >
                  {p === 100 ? "All Balance" : p + "%"}
                </button>
              ))}
            </div>

            <label className="field">
              Transfer Destination (Bank / UPI)
              <input
                required
                maxLength={90}
                value={payTo}
                onChange={(e) => setPayTo(e.target.value)}
                placeholder="e.g. driver@upi or Bank Account"
              />
              {agent?.bankName && (
                <button
                  type="button"
                  className="link-btn"
                  style={{ alignSelf: "flex-start", marginTop: "0.25rem", fontSize: "0.75rem" }}
                  onClick={() =>
                    setPayTo(`${agent.bankName} (A/C: ${agent.accountNumber}, IFSC: ${agent.ifscCode})`)
                  }
                >
                  Use Bank: {agent.bankName} (..{agent.accountNumber.slice(-4)})
                </button>
              )}
            </label>

            {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}

            <GlassButton
              type="submit"
              variant="solid"
              block
              disabled={busy || wallet.balance < wallet.minWithdrawal}
            >
              {busy ? "Submitting Request..." : "Request Payout"}
            </GlassButton>
            <p className="dash-note left">
              Withdrawal requests are processed by Vyapari Finance and transferred directly to your bank account.
            </p>
          </form>
        </section>

        {/* Passbook Panel */}
        <section className="panel">
          <h2 className="stack-title small">
            <em>Ledger records</em>
            <strong>Earnings Passbook</strong>
          </h2>

          {wallet.transactions?.length === 0 ? (
            <p className="dash-note">No transactions recorded yet.</p>
          ) : (
            <div className="table-wrap" data-lenis-prevent-wheel>
              <table className="table passbook">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th className="num">Credit</th>
                    <th className="num">Debit</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((t) => {
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
                          <span className={"badge " + cls}>{label}</span>
                        </td>
                        <td className="num pos">{t.type === "CREDIT" ? formatPrice(t.amount) : ""}</td>
                        <td className="num neg">{t.type === "DEBIT" ? formatPrice(t.amount) : ""}</td>
                        <td className="num">{formatPrice(t.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
