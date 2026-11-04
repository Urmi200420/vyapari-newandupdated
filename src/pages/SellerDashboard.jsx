import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import GlassButton from "../components/GlassButton.jsx";
import { USE_MOCK } from "../api";
import Overview from "../s-dashboard/Overview.jsx";
import Inventory from "../s-dashboard/Inventory.jsx";
import Orders from "../s-dashboard/Orders.jsx";
import History from "../s-dashboard/History.jsx";
import Reviews from "../s-dashboard/Reviews.jsx";
import Wallet from "../s-dashboard/Wallet.jsx";
import Profile from "../s-dashboard/Profile.jsx";
import Support from "../s-dashboard/Support.jsx";
import Complaints from "../s-dashboard/Complaints.jsx";
import "../s-dashboard/dashboard.css";

const TABS = [
  { id: "overview", icon: "📊", label: "Sales overview", title: "Sales overview", Page: Overview },
  { id: "inventory", icon: "🛍️", label: "Inventory & products", title: "Inventory", Page: Inventory },
  { id: "orders", icon: "🛵", label: "Orders & delivery", title: "Orders", Page: Orders },
  { id: "history", icon: "📜", label: "Order history", title: "Order history", Page: History },
  { id: "reviews", icon: "⭐", label: "Customer reviews", title: "Reviews", Page: Reviews },
  { id: "complaints", icon: "🧾", label: "Customer complaints", title: "Customer complaints", Page: Complaints },
  { id: "wallet", icon: "👛", label: "Wallet", title: "Wallet", Page: Wallet },
  { id: "profile", icon: "🏪", label: "Shop profile", title: "Shop profile", Page: Profile },
  { id: "support", icon: "💬", label: "Contact admin", title: "Contact admin", Page: Support },
];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  // With the real backend, only logged-in sellers get in. With demo data the page is open.
  if (!USE_MOCK && localStorage.getItem("vyapari_role") !== "seller") return <Navigate to="/login" replace />;

  const tab = TABS.find((t) => t.id === params.get("tab")) || TABS[0];
  const go = (id) => {
    setParams({ tab: id });
    setMenuOpen(false);
  };
  const logout = () => {
    try {
      localStorage.removeItem("vyapari_role");
    } catch {
      /* ignore */
    }
    navigate("/");
  };

  return (
    <div className="shell">
      <div className={"scrim" + (menuOpen ? " show" : "")} onClick={() => setMenuOpen(false)} />
      <aside className={"sidebar glass-panel" + (menuOpen ? " open" : "")}>
        <div className="side-head">
          <span className="logo">Vyapari</span>
          <button className="close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            ✕
          </button>
        </div>
        <p className="side-label">Merchant console</p>

        <div className="side-scroll" data-lenis-prevent>
          <nav className="cat-list">
            {TABS.map((t) => (
              <button key={t.id} className={"cat" + (tab.id === t.id ? " active" : "")} onClick={() => go(t.id)}>
                <span className="cat-icon">{t.icon}</span>
                <span className="cat-name">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="side-foot">
          {USE_MOCK && <p className="guest-tag">🧪 Showing demo data</p>}
          <GlassButton to="/" block>
            ← Back to store
          </GlassButton>
          <GlassButton to="/seller" block onClick={USE_MOCK ? undefined : logout}>
            Exit portal
          </GlassButton>
        </div>
      </aside>

      <main className="main">
        <header className="topbar glass-panel">
          <button className="menu-btn glass" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <h1 className="dash-title">
            <em>Seller dashboard</em>
            <strong>{tab.title}</strong>
          </h1>
        </header>

        {/* key = tab id, so each tab loads fresh when you switch to it */}
        <tab.Page key={tab.id} goTo={go} />
      </main>
    </div>
  );
}