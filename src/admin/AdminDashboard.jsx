import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { USE_MOCK } from "../api";
import { BYPASS_ADMIN_AUTH } from "./bypass.js";
import { AdminProvider, useAdmin } from "./AdminContext.jsx";
import AdminSidebar from "./AdminSidebar.jsx";
import AdminOverview from "./sections/AdminOverview.jsx";
import SellerManagement from "./sections/SellerManagement.jsx";
import DeliveryManagement from "./sections/DeliveryManagement.jsx";
import UserManagement from "./sections/users/UserManagement.jsx";
import TicketManagement from "./sections/tickets/TicketManagement.jsx";
import CatalogManagement from "./sections/CatalogManagement.jsx";
import OrderManagement from "./sections/OrderManagement.jsx";
import RefundManagement from "./sections/RefundManagement.jsx";
import AdminAnalytics from "./sections/AdminAnalytics.jsx";
import AdminManagement from "./sections/AdminManagement.jsx";
import { me } from "./data/store.js";
import { Avatar } from "./ui.jsx";
// the seller dashboard styles are reused as-is (stat cards, charts, tables, badges, pop-ups)
import "../s-dashboard/dashboard.css";
import "./admin.css";

const SECTIONS = [
  { id: "overview", icon: "📊", label: "Admin overview", title: "Platform overview", group: "Platform", Page: AdminOverview },
  { id: "sellers", icon: "🏪", label: "Seller management", title: "Seller management", group: "People", Page: SellerManagement },
  { id: "delivery", icon: "🛵", label: "Delivery personnel", title: "Delivery personnel", group: "People", Page: DeliveryManagement },
  { id: "users", icon: "👥", label: "User management", title: "User management", group: "People", Page: UserManagement },
  { id: "tickets", icon: "🎫", label: "Support & tickets", title: "Support & tickets", group: "Operations", Page: TicketManagement },
  { id: "catalog", icon: "🗂️", label: "Platform catalog", title: "Catalog management", group: "Operations", Page: CatalogManagement },
  { id: "orders", icon: "📦", label: "Order management", title: "Master order ledger", group: "Operations", Page: OrderManagement },
  { id: "refunds", icon: "↩️", label: "Returns & refunds", title: "Returns & refunds", group: "Finance", Page: RefundManagement },
  { id: "analytics", icon: "💹", label: "Revenue & earnings", title: "Revenue & earnings", group: "Finance", Page: AdminAnalytics },
  { id: "admins", icon: "🛡️", label: "Admin management", title: "Admin management", group: "Settings", Page: AdminManagement },
];

export default function AdminDashboard() {
  // Same rule as the seller dashboard: open with demo data, admin login required with the real backend.
  if (!BYPASS_ADMIN_AUTH && !USE_MOCK && localStorage.getItem("vyapari_role") !== "admin") return <Navigate to="/login?role=admin" replace />;
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  const { db, reset } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const section = SECTIONS.find((s) => s.id === params.get("tab")) || SECTIONS[0];
  const view = params.get("view") || "";
  const go = (id, v) => {
    setParams(v ? { tab: id, view: v } : { tab: id });
    setMenuOpen(false);
  };
  const setView = (v) => setParams({ tab: section.id, view: v }, { replace: true });
  const exit = () => {
    try {
      localStorage.removeItem("vyapari_role");
    } catch {
      /* ignore */
    }
    navigate("/");
  };

  const pendingSellers = db.sellers.filter((s) => s.status === "PENDING").length;
  const openTickets = db.tickets.filter((t) => t.status === "OPEN").length;
  const urgent = db.tickets.some((t) => t.status === "OPEN" && t.priority === "URGENT");
  const unassigned = db.orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status) && !o.deliveryPersonId).length;
  const pendingRefunds = db.refunds.filter((r) => r.status === "PENDING" || r.status === "UNDER_REVIEW").length;
  const counts = { sellers: [pendingSellers, true], delivery: [unassigned, false], tickets: [openTickets, urgent], refunds: [pendingRefunds, false] };

  const groups = [];
  for (const s of SECTIONS) {
    let g = groups.find((x) => x.label === s.group);
    if (!g) groups.push((g = { label: s.group, tabs: [] }));
    g.tabs.push({ ...s, count: counts[s.id]?.[0] || 0, alert: counts[s.id]?.[1] });
  }
  const admin = me(db);
  const attention = pendingSellers + pendingRefunds + openTickets;

  return (
    <div className="shell ad-shell">
      <AdminSidebar groups={groups} active={section.id} onSelect={(id) => go(id)} open={menuOpen} onClose={() => setMenuOpen(false)} onExit={exit} onReset={reset} />

      <main className="main ad-main">
        <header className="topbar glass-panel ad-topbar">
          <button className="menu-btn glass" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <h1 className="dash-title">
            <em>Admin dashboard</em>
            <strong>{section.title}</strong>
          </h1>
          <div className="ad-top-tools">
            {attention > 0 && (
              <button type="button" className="ad-attn glass" onClick={() => go("overview", "attention")} title="Items waiting for an admin">
                <span className="ad-attn-dot" />
                <span>{attention}</span>
                <span className="ad-attn-label">need attention</span>
              </button>
            )}
            <button type="button" className="ad-me" onClick={() => go("admins")} title="Your admin account">
              <Avatar name={admin.name} />
              <span className="ad-me-text">
                <b>{admin.name}</b>
                <span>{admin.role}</span>
              </span>
            </button>
          </div>
        </header>

        <div className="ad-page" key={section.id}>
          <section.Page goTo={go} view={view} setView={setView} />
        </div>
      </main>
    </div>
  );
}
