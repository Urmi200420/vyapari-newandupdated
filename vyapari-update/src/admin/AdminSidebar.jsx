import { useState } from "react";
import GlassButton from "../components/GlassButton.jsx";
import { USE_MOCK } from "../api";
import { Confirm } from "./ui.jsx";

/*
  Same glass sidebar as the seller / delivery dashboards (classes from styles.css),
  with grouped sections and live counters.
*/
export default function AdminSidebar({ groups, active, onSelect, open, onClose, onExit, onReset }) {
  const [askReset, setAskReset] = useState(false);
  return (
    <>
      <div className={"scrim" + (open ? " show" : "")} onClick={onClose} />
      <aside className={"sidebar glass-panel ad-sidebar" + (open ? " open" : "")} aria-label="Admin navigation">
        <div className="side-head">
          <span className="logo">Vyapari</span>
          <button className="close-btn" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>
        <p className="side-label ad-console-label">
          <span className="ad-shield">🛡️</span> Admin console
        </p>

        <div className="side-scroll" data-lenis-prevent>
          {groups.map((g) => (
            <div key={g.label} className="ad-nav-group">
              <p className="side-label">{g.label}</p>
              <nav className="cat-list">
                {g.tabs.map((t) => (
                  <button key={t.id} className={"cat" + (active === t.id ? " active" : "")} onClick={() => onSelect(t.id)} aria-current={active === t.id ? "page" : undefined}>
                    <span className="cat-icon">{t.icon}</span>
                    <span className="cat-name">{t.label}</span>
                    {t.count > 0 && <span className={"ad-count" + (t.alert ? " alert" : "")}>{t.count}</span>}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="side-foot">
          {USE_MOCK && <p className="guest-tag">🧪 Showing demo data</p>}
          <button type="button" className="ad-reset" onClick={() => setAskReset(true)}>
            ↺ Reset demo data
          </button>
          <GlassButton to="/" block>
            ← Back to store
          </GlassButton>
          <GlassButton block onClick={onExit}>
            Exit admin
          </GlassButton>
        </div>
      </aside>
      {askReset && (
        <Confirm
          title="Reset demo data?"
          message="Every change made in the admin dashboard on this browser (approvals, assignments, tickets, categories, admins) will be replaced with the original sample data. The other dashboards are not affected."
          confirm="Reset"
          danger
          onConfirm={onReset}
          onClose={() => setAskReset(false)}
        />
      )}
    </>
  );
}
