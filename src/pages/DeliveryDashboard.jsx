import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GlassButton from "../components/GlassButton.jsx";
import {
  getDeliveryShipments,
  getDeliveryProfile,
  saveDeliveryProfile,
  toggleDutyStatus,
  claimShipment,
  rejectShipment,
  startDeliveryRun,
  verifyDeliveryOtp,
  getDeliveryWallet,
  requestDeliveryWithdrawal,
  USE_MOCK,
} from "../api";

import ActiveDeliveries from "../d-dashboard/ActiveDeliveries.jsx";
import AvailablePool from "../d-dashboard/AvailablePool.jsx";
import DeliveryHistory from "../d-dashboard/DeliveryHistory.jsx";
import DeliveryWallet from "../d-dashboard/DeliveryWallet.jsx";
import DeliveryProfile from "../d-dashboard/DeliveryProfile.jsx";
import DeliveryTickets from "../d-dashboard/DeliveryTickets.jsx";

import "../s-dashboard/dashboard.css";
import "../d-dashboard/delivery.css";

const TABS = [
  { id: "active",  icon: "🛵", label: "Active Deliveries",   title: "Trip Execution" },
  { id: "pool",    icon: "📦", label: "Available Pool",       title: "Available Shipments" },
  { id: "history", icon: "📜", label: "Trip History",         title: "Completed Runs" },
  { id: "wallet",  icon: "👛", label: "My Earnings & Wallet", title: "Delivery Wallet" },
  { id: "profile", icon: "👤", label: "Courier Profile",      title: "Service Profile & Areas" },
  { id: "support", icon: "🎫", label: "Support",              title: "Raise a Ticket" },
];

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  // Note: Per requirements, login is bypassed for immediate inspection and development!
  const activeTabId = params.get("tab") || "active";
  const currentTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    active: [],
    available: [],
    history: [],
    dutyStatus: 1,
    agent: null,
  });
  const [wallet, setWallet] = useState(null);

  const loadData = async () => {
    try {
      const [shipments, agentProfile, walletData] = await Promise.all([
        getDeliveryShipments(),
        getDeliveryProfile(),
        getDeliveryWallet(),
      ]);
      setData({
        active: shipments.active || [],
        available: shipments.available || [],
        history: shipments.history || [],
        dutyStatus: shipments.dutyStatus ?? agentProfile?.dutyStatus ?? 1,
        agent: agentProfile,
      });
      setWallet(walletData);
    } catch (err) {
      console.error("Failed to load delivery data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const go = (id) => {
    setParams({ tab: id });
    setMenuOpen(false);
  };

  const handleToggleDuty = async () => {
    try {
      const next = await toggleDutyStatus();
      setData((d) => ({ ...d, dutyStatus: next }));
      loadData();
    } catch (e) {
      alert("Failed to toggle duty: " + e.message);
    }
  };

  return (
    <div className="shell">
      {/* Mobile Drawer Scrim */}
      <div className={"scrim" + (menuOpen ? " show" : "")} onClick={() => setMenuOpen(false)} />

      {/* Sidebar */}
      <aside className={"sidebar glass-panel" + (menuOpen ? " open" : "")}>
        <div className="side-head">
          <span className="logo">Vyapari</span>
          <button className="close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>
        <p className="side-label">Delivery Partner Console</p>

        {/* Courier Duty Switch in Sidebar */}
        <div style={{ padding: "0 0.4rem 0.8rem" }}>
          <button
            type="button"
            className={"duty-toggle-btn " + (data.dutyStatus === 1 ? "on" : "off")}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleToggleDuty}
          >
            <span className="duty-indicator" />
            {data.dutyStatus === 1 ? "Duty Status: ON" : "Duty Status: OFF"}
          </button>
        </div>

        <div className="side-scroll" data-lenis-prevent>
          <nav className="cat-list">
            {TABS.map((t) => {
              const badgeCount =
                t.id === "active"
                  ? data.active.length
                  : t.id === "pool"
                  ? data.available.length
                  : null;

              return (
                <button
                  key={t.id}
                  className={"cat" + (currentTab.id === t.id ? " active" : "")}
                  onClick={() => go(t.id)}
                >
                  <span className="cat-icon">{t.icon}</span>
                  <span className="cat-name">{t.label}</span>
                  {badgeCount !== null && badgeCount > 0 && (
                    <span className="pill" style={{ padding: "0.1rem 0.45rem", fontSize: "0.72rem" }}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="side-foot">
          <p className="guest-tag">🛵 Courier: {data.agent?.name || "Amit Kumar"}</p>
          <GlassButton to="/" block>
            ← Back to Store
          </GlassButton>
          <GlassButton to="/seller/dashboard" block>
            Seller Console →
          </GlassButton>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header className="topbar glass-panel" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button className="menu-btn glass" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              ☰
            </button>
            <h1 className="dash-title">
              <em>Delivery Partner Console</em>
              <strong>{currentTab.title}</strong>
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              type="button"
              className={"duty-toggle-btn " + (data.dutyStatus === 1 ? "on" : "off")}
              onClick={handleToggleDuty}
              title="Click to toggle availability"
            >
              <span className="duty-indicator" />
              {data.dutyStatus === 1 ? "On Duty" : "Off Duty"}
            </button>
            <GlassButton onClick={loadData}>↻ Refresh</GlassButton>
          </div>
        </header>

        {loading && !data.agent ? (
          <div className="panel" style={{ padding: "3rem", textAlign: "center" }}>
            <p className="dash-note">Loading delivery partner portal...</p>
          </div>
        ) : (
          <>
            {currentTab.id === "active" && (
              <ActiveDeliveries
                active={data.active}
                dutyStatus={data.dutyStatus}
                onToggleDuty={handleToggleDuty}
                onStartRun={startDeliveryRun}
                onVerifyOtp={verifyDeliveryOtp}
                onReject={rejectShipment}
                reload={loadData}
              />
            )}

            {currentTab.id === "pool" && (
              <AvailablePool
                available={data.available}
                dutyStatus={data.dutyStatus}
                onToggleDuty={handleToggleDuty}
                onClaim={async (id) => {
                  await claimShipment(id);
                  go("active");
                }}
                reload={loadData}
              />
            )}

            {currentTab.id === "history" && (
              <DeliveryHistory history={data.history} />
            )}

            {currentTab.id === "wallet" && (
              <DeliveryWallet
                wallet={wallet}
                agent={data.agent}
                onWithdraw={requestDeliveryWithdrawal}
                reload={loadData}
              />
            )}

            {currentTab.id === "profile" && (
              <DeliveryProfile
                agent={data.agent}
                onSave={saveDeliveryProfile}
                onToggleDuty={handleToggleDuty}
                reload={loadData}
              />
            )}

            {currentTab.id === "support" && (
              <DeliveryTickets riderName={data.agent?.name || ""} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
