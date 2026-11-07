import { useNavigate } from "react-router-dom";
import { categories } from "../data.js";
import GlassButton from "./GlassButton.jsx";
import { USE_MOCK } from "../api";
import { BYPASS_ADMIN_AUTH } from "../admin/bypass.js";

export default function Sidebar({ active, onSelect, counts, open, onClose, onCross }) {
  const navigate = useNavigate();
  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div className={"scrim" + (open ? " show" : "")} onClick={onClose} />
      <aside className={"sidebar glass-panel" + (open ? " open" : "")}>
        <div className="side-head">
          <span className="logo">Vyapari</span>
          <button className="close-btn" onClick={onCross ?? onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        {/* data-lenis-prevent lets this list scroll on its own, separately from the page */}
        <div className="side-scroll" data-lenis-prevent>
          <p className="side-label">Shop by category</p>
          <nav className="cat-list">
            {categories.map((c) => (
              <button
                key={c.id}
                className={"cat" + (active === c.id ? " active" : "")}
                onClick={() => {
                  onSelect(c.id);
                  onClose();
                }}
              >
                <span className="cat-icon">{c.icon}</span>
                <span className="cat-name">{c.label}</span>
                <span className="cat-count">{counts[c.id] ?? 0}</span>
              </button>
            ))}
          </nav>

          <p className="side-label">Staff access</p>
          <div className="staff-links">
            <GlassButton onClick={() => goTo(BYPASS_ADMIN_AUTH ? "/admin" : "/login?role=admin")}>🛡️ Admin</GlassButton>
            <GlassButton onClick={() => goTo(USE_MOCK ? "/delivery/dashboard" : "/login?role=delivery")}>🛵 Delivery</GlassButton>
            {/* demo shortcut: only shown while the dashboard uses fake data */}
            {USE_MOCK && <GlassButton onClick={() => goTo("/seller/dashboard")}>🏪 Seller (demo)</GlassButton>}
          </div>
        </div>

        <div className="side-foot">
          <p className="guest-tag">👤 Browsing as guest</p>
          <GlassButton to="/customer" variant="solid" block onClick={onClose}>
            Log in
          </GlassButton>
          <GlassButton to="/customer" block onClick={onClose}>
            Create account
          </GlassButton>
        </div>
      </aside>
    </>
  );
}