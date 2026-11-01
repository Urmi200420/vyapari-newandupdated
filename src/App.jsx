import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Intro from "./components/Intro.jsx";
import GlassDefs from "./components/GlassDefs.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import SellerLanding from "./pages/SellerLanding.jsx";
import DeliveryDashboard from "./pages/DeliveryDashboard.jsx";
import { startSmoothScroll, scrollToTop } from "./smoothScroll.js";

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
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/seller" element={<SellerLanding />} />
          <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
          <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
          <Route path="/delivery" element={<DeliveryDashboard />} />
        </Routes>
      )}
    </>
  );
}