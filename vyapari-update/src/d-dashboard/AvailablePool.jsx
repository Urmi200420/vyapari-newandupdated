import { useState } from "react";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";

export default function AvailablePool({ available = [], onClaim, dutyStatus = 1, onToggleDuty, reload }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const handleClaim = async (orderId) => {
    if (!dutyStatus) {
      return setError("You must turn ON your Duty Status to claim shipments.");
    }
    setError("");
    setBusyId(orderId);
    try {
      await onClaim(orderId);
      reload();
    } catch (err) {
      setError(err.message || "Could not claim order.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="dash-stack">
      {dutyStatus === 0 && (
        <div className="duty-warning-banner">
          <span>⚠️ You are <strong>OFF-DUTY</strong>. You must switch ON duty to claim new shipments.</span>
          <GlassButton onClick={onToggleDuty} variant="solid">
            Go On Duty
          </GlassButton>
        </div>
      )}

      {error && <p className="form-msg error">{error}</p>}

      <div className="dash-row between">
        <h2 className="stack-title small">
          <em>Ready at seller storefront</em>
          <strong>Available Pool ({available.length})</strong>
        </h2>
        <GlassButton onClick={reload}>↻ Refresh Pool</GlassButton>
      </div>

      <p className="dash-note left">
        Shipments packed and marked <strong>Ready for Pickup</strong> by sellers in your registered delivery pincodes.
      </p>

      {available.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <p className="dash-note" style={{ fontSize: "1rem" }}>
            No new packages currently waiting in your pincode zones.
          </p>
          <p className="dash-note" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            As soon as merchants pack an order, it pops up here instantly.
          </p>
        </div>
      ) : (
        <div className="delivery-grid">
          {available.map((order) => {
            const seller = order.seller || {};
            return (
              <article key={order.id} className="trip-card">
                <div className="trip-head">
                  <div>
                    <span className="trip-id">ORD-{order.id}</span>
                    <span className="pill" style={{ marginLeft: "0.6rem" }}>
                      PIN: {order.pincode || "700029"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <span className="trip-fare">Payout: +₹40</span>
                    <span className="badge st-packed">Ready For Pickup</span>
                  </div>
                </div>

                <div className="trip-route">
                  <div className="location-box">
                    <span className="loc-tag">🏬 Collect from Seller</span>
                    <strong className="loc-name">{seller.shopName || "Seller Storefront"}</strong>
                    <span className="loc-phone">📞 {seller.phone || "N/A"}</span>
                    <p className="loc-address">
                      📍 {seller.pickupAddress || "Seller Warehouse Hub, Kolkata"}
                    </p>
                  </div>

                  <div className="location-box drop">
                    <span className="loc-tag">🏠 Drop to Customer</span>
                    <strong className="loc-name">{order.customer}</strong>
                    <p className="loc-address">📍 {order.address}</p>
                    <span className="loc-landmark">PIN: {order.pincode} · COD to Collect: {formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="trip-actions">
                  <GlassButton
                    variant="solid"
                    disabled={busyId === order.id || dutyStatus === 0}
                    onClick={() => handleClaim(order.id)}
                  >
                    {busyId === order.id ? "Claiming..." : "⚡ Claim Shipment (+₹40)"}
                  </GlassButton>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {order.items?.length || 1} items to deliver
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
