import { useState } from "react";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import OtpModal from "./OtpModal.jsx";
import { fmtDate, fmtTime } from "../s-dashboard/parts.jsx";

export default function ActiveDeliveries({
  active = [],
  onStartRun,
  onVerifyOtp,
  onReject,
  dutyStatus = 1,
  onToggleDuty,
  reload,
}) {
  const [otpOrder, setOtpOrder] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("Vehicle breakdown / puncture");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const handleStart = async (order) => {
    setBusyId(order.id);
    setActionError("");
    try {
      await onStartRun(order.id);
      reload();
    } catch (err) {
      setActionError(err.message || "Could not start delivery run.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (orderId) => {
    setBusyId(orderId);
    setActionError("");
    try {
      await onReject(orderId, rejectReason);
      setRejectingId(null);
      reload();
    } catch (err) {
      setActionError(err.message || "Could not return order to queue.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dash-stack">
      {dutyStatus === 0 && (
        <div className="duty-warning-banner">
          <span>⚠️ You are currently <strong>OFF-DUTY</strong>. Switch ON duty to receive new pickups.</span>
          <GlassButton onClick={onToggleDuty} variant="solid">
            Go On Duty
          </GlassButton>
        </div>
      )}

      {actionError && <p className="form-msg error">{actionError}</p>}

      <div className="dash-row between">
        <h2 className="stack-title small">
          <em>Trip execution</em>
          <strong>Active Deliveries ({active.length})</strong>
        </h2>
        <GlassButton onClick={reload}>↻ Refresh Trips</GlassButton>
      </div>

      {active.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <p className="dash-note" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
            No active trips assigned right now.
          </p>
          <p className="dash-note left" style={{ maxWidth: 440, margin: "0 auto 1.2rem" }}>
            Check the <strong>Available Pool</strong> tab to claim packages ready for pickup in your pincodes.
          </p>
        </div>
      ) : (
        <div className="delivery-grid">
          {active.map((order) => {
            const isRunStarted = order.status === "OUT_FOR_DELIVERY";
            const seller = order.seller || {};

            return (
              <article key={order.id} className={"trip-card" + (isRunStarted ? " active-run" : "")}>
                {/* Trip Header */}
                <div className="trip-head">
                  <div>
                    <span className="trip-id">ORD-{order.id}</span>
                    <span style={{ marginLeft: "0.8rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                      Placed {fmtDate(order.createdAt)} at {fmtTime(order.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <span className="trip-fare">Payout: ₹40</span>
                    <span className={"badge " + (isRunStarted ? "st-out" : "st-packed")}>
                      {isRunStarted ? "🛵 Out For Delivery" : "📦 Ready At Store"}
                    </span>
                  </div>
                </div>

                {/* Pickup & Customer Details */}
                <div className="trip-route">
                  {/* Step 1: Pickup from Seller */}
                  <div className="location-box">
                    <span className="loc-tag">🏬 1. Seller Pickup Store</span>
                    <strong className="loc-name">{seller.shopName || "Seller Storefront"}</strong>
                    <span className="loc-phone">📞 {seller.phone || "N/A"}</span>
                    <p className="loc-address">
                      📍 {seller.pickupAddress || order.pickupAddress || "Seller Warehouse Hub, Kolkata - 700029"}
                    </p>
                  </div>

                  {/* Step 2: Deliver to Customer */}
                  <div className="location-box drop">
                    <span className="loc-tag">🏠 2. Customer Destination</span>
                    <strong className="loc-name">{order.customer}</strong>
                    <span className="loc-phone">📞 {order.customerPhone || "+91 98765 00000"}</span>
                    <p className="loc-address">📍 {order.address}</p>
                    <span className="loc-landmark">📌 PIN: {order.pincode || "700029"} · Landmark: Near Main Gate</span>
                  </div>
                </div>

                {/* COD & Order Items */}
                <div className="trip-items-summary">
                  <b>Cash to Collect (COD):</b>{" "}
                  <strong style={{ color: "var(--cream)", fontSize: "1rem" }}>{formatPrice(order.total)}</strong>
                  <span style={{ margin: "0 0.5rem" }}>·</span>
                  <span>Items: {order.items.map((i) => `${i.name} (x${i.qty})`).join(", ")}</span>
                </div>

                {/* 3-State Action Controls */}
                <div className="trip-actions">
                  {!isRunStarted ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-solid btn-run-start"
                        disabled={busyId === order.id}
                        onClick={() => handleStart(order)}
                      >
                        {busyId === order.id ? "Updating..." : "🚀 Start Delivery Run"}
                      </button>

                      {rejectingId === order.id ? (
                        <div className="reject-box" style={{ flex: 1 }}>
                          <label className="field">
                            Reason for returning to pool:
                            <select
                              className="select"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            >
                              <option>Vehicle breakdown / puncture</option>
                              <option>Package oversized for vehicle</option>
                              <option>Medical emergency</option>
                              <option>Store was closed</option>
                            </select>
                          </label>
                          <div className="dash-row">
                            <GlassButton
                              variant="solid"
                              disabled={busyId === order.id}
                              onClick={() => handleReject(order.id)}
                            >
                              Confirm Return
                            </GlassButton>
                            <button className="link-btn" onClick={() => setRejectingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="link-btn danger"
                          onClick={() => setRejectingId(order.id)}
                        >
                          ✕ Reject / Vehicle Breakdown
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-solid btn-verify-otp"
                        onClick={() => setOtpOrder(order)}
                      >
                        🔐 Handover &amp; Verify Customer OTP
                      </button>
                      <span style={{ fontSize: "0.8rem", color: "var(--star)" }}>
                        ✨ Enter the customer's 4-digit code to conclude this delivery run.
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {otpOrder && (
        <OtpModal
          order={otpOrder}
          onVerify={async (id, otp) => {
            await onVerifyOtp(id, otp);
            reload();
          }}
          onClose={() => setOtpOrder(null)}
        />
      )}
    </div>
  );
}
