import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Intro from "./components/Intro.jsx";
import GlassDefs from "./components/GlassDefs.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import SellerLanding from "./pages/SellerLanding.jsx";
import DeliveryDashboard from "./pages/DeliveryDashboard.jsx";
import { startSmoothScroll, scrollToTop } from "./smoothScroll.js";
import Customer from "./customer/Customer.jsx";
import RequireRole from "./components/RequireRole.jsx";

// Admin dashboard loads on demand, so the other pages ship the same bundle as before
const AdminDashboard = lazy(() => import("./admin/AdminDashboard.jsx"));

// Each dashboard is locked to one role. Anyone else is sent to the page named in "to".
const admin = (
  <RequireRole role="admin" to="/login?role=admin">
    <Suspense fallback={<p className="dash-note">Loading admin dashboard...</p>}>
      <AdminDashboard />
    </Suspense>
  </RequireRole>
);
const seller = (
  <RequireRole role="seller" to="/seller">
    <SellerDashboard />
  </RequireRole>
);
const customer = (
  <RequireRole role="customer" to="/login">
    <Customer />
  </RequireRole>
);
const delivery = (
  <RequireRole role="delivery" to="/login?role=delivery">
    <DeliveryDashboard />
  </RequireRole>
);

export default function App() {
  const { pathname } = useLocation();

  const [introDone, setIntroDone] = useState(() => {
    try {
      return sessionStorage.getItem("vyapari_intro") === "1";
    } catch {
      return false;
    }
  });

  const finishIntro = () => {
    try {
      sessionStorage.setItem("vyapari_intro", "1");
    } catch {
      /* ignore */
    }
    setIntroDone(true);
  };

  useEffect(() => startSmoothScroll(), []);
  useEffect(() => scrollToTop(), [pathname]);

  return (
    <>
      <GlassDefs />
      {!introDone ? (
        <Intro onDone={finishIntro} />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route path="/seller" element={<SellerLanding />} />
          <Route path="/seller/dashboard" element={seller} />
          <Route path="/seller-dashboard" element={seller} />

          <Route path="/delivery" element={delivery} />
          <Route path="/delivery/dashboard" element={delivery} />
          <Route path="/delivery-dashboard" element={delivery} />

          <Route path="/customer/*" element={customer} />

          <Route path="/admin" element={admin} />
          <Route path="/admin/dashboard" element={admin} />
          <Route path="/admin-dashboard" element={admin} />

          {/* anything else goes home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}