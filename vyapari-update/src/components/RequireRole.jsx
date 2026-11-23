import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

// Wrap a dashboard so only the right, logged-in, approved person can open it.
//   <RequireRole role="seller" to="/seller"><SellerDashboard /></RequireRole>
// With the real backend it asks the server who is logged in (GET /api/auth/me), so a
// stale browser value, a blocked seller or an expired session cannot get in.
// In demo mode (VITE_REAL_AUTH is not "true") it lets everyone through, like before.
const REAL = import.meta.env.VITE_REAL_AUTH === "true";
// Delivery partners log in through Spring Boot even while other dashboards stay in demo mode,
// so the delivery dashboard is always checked against the server session in that mode.
const REAL_DELIVERY = import.meta.env.VITE_REAL_DELIVERY_AUTH === "true";
const checksServer = (role) => REAL || (role === "delivery" && REAL_DELIVERY);

export default function RequireRole({ role, to = "/login", children }) {
  const [state, setState] = useState(checksServer(role) ? "checking" : "ok");

  useEffect(() => {
    if (!checksServer(role)) return;
    let alive = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (!alive) return;
        if (me && String(me.role).toLowerCase() === role) {
          try {
            localStorage.setItem("vyapari_role", role);
            localStorage.setItem("vyapari_user", JSON.stringify({ ...me, role }));
          } catch {}
          setState("ok");
        } else {
          try {
            localStorage.removeItem("vyapari_role");
            localStorage.removeItem("vyapari_user");
          } catch {}
          setState("no");
        }
      })
      .catch(() => alive && setState("no"));
    return () => {
      alive = false;
    };
  }, [role]);

  if (state === "checking") return <p style={{ padding: "2rem", textAlign: "center" }}>Checking your login…</p>;
  if (state === "no") return <Navigate to={to} replace />;
  return children;
}