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
import { REAL_DELIVERY, getMyDeliveryAccount, saveMyDeliveryAccount } from "../api/deliveryAccount.js";
import { logout } from "../api/auth.js";

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
  const [loadError, setLoadError] = useState("");

  // The verified account (name, contact, vehicle, PIN codes) comes from MySQL; trips and wallet stay demo data.
  const loadAccount = async () => {
    if (!REAL_DELIVERY) return null;
    try {
      const account = await getMyDeliveryAccount();
      if (USE_MOCK) {
        // keep the demo shipment pool in step with the partner's real identity and service areas
        const demo = await getDeliveryProfile();
        if (demo?.name !== account.name || demo?.phone !== account.phone || demo?.email !== account.email
            || (demo?.pincodes || []).join() !== account.pincodes.join()) {
          await saveDeliveryProfile({ id: account.id, name: account.name, phone: account.phone, email: account.email,
            pincodes: account.pincodes, vehicleType: account.vehicleType, vehicleNumber: account.vehicleNumber });
        }
      }
      return account;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        // session ended (logged out, blocked by an admin, or expired)
        try { localStorage.removeItem("vyapari_role"); localStorage.removeItem("vyapari_user"); } catch { /* ignore */ }
        navigate("/login?role=delivery", { replace: true });
      }
      throw err;
    }
  };

  const loadData = async () => {
    try {
      const account = await loadAccount();
      const [shipments, demoProfile, walletData] = await Promise.all([
        getDeliveryShipments(),
        getDeliveryProfile(),
        getDeliveryWallet(),
      ]);
      const agentProfile = account ? { ...demoProfile, ...account } : demoProfile;
      setData({
        active: shipments.active || [],
        available: shipments.available || [],
        history: shipments.history || [],
        dutyStatus: shipments.dutyStatus ?? agentProfile?.dutyStatus ?? 1,
        agent: agentProfile,
      });
      setWallet(walletData);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load delivery data:", err);
      setLoadError(err.message || "Could not load your delivery account.");
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

  const saveProfile = async (form) => {
    if (!REAL_DELIVERY) return saveDeliveryProfile(form);
    const account = await saveMyDeliveryAccount(form); // name, phone, PIN codes -> MySQL
    // bank details, photo and area labels are not on the backend yet: keep them in the demo store
    const { drivingLicense, ...demoFields } = form;
    return saveDeliveryProfile({ ...demoFields, name: account.name, phone: account.phone, pincodes: account.pincodes });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login?role=delivery", { replace: true });
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
          <p className="guest-tag">🛵 Courier: {data.agent?.name || (REAL_DELIVERY ? "" : "Amit Kumar")}</p>
          <GlassButton to="/" block>
            ← Back to Store
          </GlassButton>
          <GlassButton to="/seller/dashboard" block>
            Seller Console →
          </GlassButton>
          {REAL_DELIVERY && (
            <GlassButton onClick={handleLogout} block>
              Log out
            </GlassButton>
          )}
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

        {loadError && (
          <p className="form-msg error" role="alert">{loadError}</p>
        )}
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
                onSave={saveProfile}
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
