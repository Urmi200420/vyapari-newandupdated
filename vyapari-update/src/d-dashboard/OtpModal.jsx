import { useState } from "react";
import GlassButton from "../components/GlassButton.jsx";
import { Modal } from "../s-dashboard/parts.jsx";

export default function OtpModal({ order, onVerify, onClose }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const clean = code.trim();
    if (clean.length !== 4) {
      return setError("Please enter the complete 4-digit OTP.");
    }
    setBusy(true);
    try {
      await onVerify(order.id, clean);
      onClose();
    } catch (err) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={"Handover Verification · ORD-" + order.id} onClose={onClose}>
      <form onSubmit={submit} className="otp-modal-content">
        <p className="otp-prompt">
          To complete this delivery, ask <strong>{order.customer}</strong> for the 4-digit Secure OTP generated when this order went Out for Delivery.
        </p>

        {order.otp && (
          <div className="otp-demo-hint">
            <span>Customer's Phone Received Code: <strong>{order.otp}</strong></span>
            <button
              type="button"
              className="link-btn"
              style={{ marginLeft: "0.6rem", fontSize: "0.78rem" }}
              onClick={() => setCode(order.otp)}
            >
              Fill Demo OTP
            </button>
          </div>
        )}

        <div className="otp-input-wrap">
          <input
            className="otp-big-input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="••••"
          />
        </div>

        {error && <p className="form-msg error">{error}</p>}

        <div className="dash-row center">
          <GlassButton type="submit" variant="solid" disabled={busy || code.length !== 4}>
            {busy ? "Verifying OTP..." : "✓ Confirm Handover & Complete Delivery"}
          </GlassButton>
          <GlassButton type="button" onClick={onClose} disabled={busy}>
            Cancel
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
