import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, register } from "../api/auth.js";

// one look for every box, same as before
const inputStyle = { width: '100%', padding: '14px 18px', borderRadius: '12px', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(15, 42, 29, 0.2)', color: '#0F2A1D', outline: 'none', fontSize: '15px' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' };

export default function SellerLanding() {
  const navigate = useNavigate();
  const loginRef = useRef(null);
  const registerRef = useRef(null);

  // Form states
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    storeType: "Groceries & Essentials",
    aadhaarNumber: "",
    location: ""
  });
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Real login: only an approved seller gets in
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setNotice("");
    setBusy(true);
    try {
      await login({ email: loginData.email, password: loginData.password, role: "seller" });
      navigate('/seller-dashboard');
    } catch (err) {
      setLoginError(err.message || "Could not log in");
    } finally {
      setBusy(false);
    }
  };

  // Real registration: the application goes to the admin as PENDING
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setNotice("");
    setBusy(true);
    try {
      await register({
        name: registerData.ownerName,
        email: registerData.email,
        phone: registerData.phone,
        password: registerData.password,
        role: "seller",
        shopName: registerData.storeName,
        city: registerData.location,
        // storeType and aadhaarNumber stay in this form; the backend does not store them yet
      });
      setNotice("Application sent! You can log in as soon as an admin approves your store.");
      setLoginData({ email: registerData.email, password: "" });
      setRegisterData({ ...registerData, password: "" });
      scrollToLogin();
    } catch (err) {
      setRegisterError(err.message || "Could not send your application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '1320px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* TOP VIEWPORT: Full-Screen Rectangular Hero Section */}
        <div style={{
          minHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          
          {/* Topbar Navigation */}
          <header className="topbar panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontWeight: '700', fontSize: '18px' }}>Vyapari Seller Portal</span>
            <Link to="/" className="btn btn-ghost" style={{ fontSize: '13px', padding: '8px 16px', textDecoration: 'none' }}>
              Back to Store
            </Link>
          </header>

          {/* Huge Desktop Rectangular Banner */}
          <section className="hero panel" style={{ 
            flex: 1,
            width: '100%', 
            padding: '60px 40px', 
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            borderRadius: '24px',
            animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <div style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
              <p className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px', margin: 0 }}>
                Grow your business digitally
              </p>
              
              <h1 style={{ fontSize: '56px', lineHeight: '1.1', margin: 0, fontWeight: '800' }}>
                <em>Scale your store with </em>
                <strong>Vyapari</strong>
              </h1>
              
              <p className="hero-sub" style={{ fontSize: '20px', opacity: 0.85, maxWidth: '680px', margin: '0 auto', lineHeight: '1.5' }}>
                Reach thousands of active local shoppers, manage your inventory effortlessly, and receive instant secure payouts.
              </p>

              {/* Action Buttons */}
              <div className="hero-actions" style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-solid" onClick={scrollToLogin} style={{ padding: '16px 36px', fontSize: '16px', fontWeight: '600' }}>
                  Existing User Login
                </button>
                <button className="btn btn-ghost" onClick={scrollToRegister} style={{ padding: '16px 36px', fontSize: '16px', fontWeight: '600' }}>
                  Register New Store
                </button>
              </div>

              {/* Merchant Highlights */}
              <div className="hero-stats" style={{ display: 'flex', gap: '50px', marginTop: '40px', paddingTop: '30px', borderTop: '1px solid rgba(15, 42, 29, 0.15)', width: '100%', justifyContent: 'center' }}>
                <div>
                  <b style={{ fontSize: '28px', display: 'block' }}>0%</b>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>Setup & Listing Fees</span>
                </div>
                <div>
                  <b style={{ fontSize: '28px', display: 'block' }}>24/7</b>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>Merchant Dashboard</span>
                </div>
                <div>
                  <b style={{ fontSize: '28px', display: 'block' }}>Instant</b>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>Direct Payouts</span>
                </div>
              </div>
            </div>
          </section>
        </div>


        {/* BELOW THE FOLD: Form Sections */}
        
        {/* 1. Existing Seller Login Panel */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingTop: '40px' }}>
          <section ref={loginRef} className="panel" style={{ padding: '50px', width: '100%', maxWidth: '620px', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Seller Login</h2>
              <p style={{ opacity: 0.7, fontSize: '14px' }}>Welcome back! Sign in to access your store dashboard</p>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>
                  Business Email
                </label>
                <input 
                  type="email" 
                  value={loginData.email} 
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} 
                  required
                  placeholder="seller@vyapari.com"
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Password
                </label>
                <input 
                  type="password" 
                  value={loginData.password} 
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} 
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </div>

              {notice && <p role="status" style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#1f6b3a' }}>{notice}</p>}
              {loginError && <p role="alert" style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#b3261e' }}>{loginError}</p>}

              <button type="submit" disabled={busy} className="btn btn-solid" style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '16px' }}>
                {busy ? "Please wait..." : "Sign In to Portal (Go to Dashboard)"}
              </button>
            </form>
          </section>
        </div>

        {/* 2. Store Registration Panel */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: '60px' }}>
          <section ref={registerRef} className="panel" style={{ padding: '50px', width: '100%', maxWidth: '620px', boxSizing: 'border-box' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>Store Registration</h2>
              <p style={{ opacity: 0.7, fontSize: '14px' }}>New merchant? Register your store to get started</p>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>
                  Store Name
                </label>
                <input 
                  type="text" 
                  name="storeName"
                  value={registerData.storeName} 
                  onChange={(e) => setRegisterData({ ...registerData, storeName: e.target.value })} 
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g., Sharma General Store"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Store Holder Name
                </label>
                <input 
                  type="text" 
                  name="ownerName"
                  value={registerData.ownerName} 
                  onChange={(e) => setRegisterData({ ...registerData, ownerName: e.target.value })} 
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g., Rajesh Sharma"
                  style={inputStyle}
                />
              </div>

              {/* NEW: the login details for this store */}
              <div>
                <label style={labelStyle}>
                  Business Email
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={registerData.email} 
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} 
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Mobile Number
                </label>
                <input 
                  type="text" 
                  name="phone"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit mobile number"
                  maxLength={10}
                  value={registerData.phone} 
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value.replace(/\D/g, "") })} 
                  required
                  placeholder="10 digits"
                  autoComplete="tel-national"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Create Password
                </label>
                <input 
                  type="password" 
                  name="password"
                  value={registerData.password} 
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} 
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Type of Goods / Store Sells
                </label>
                <select 
                  name="storeType"
                  value={registerData.storeType} 
                  onChange={(e) => setRegisterData({ ...registerData, storeType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Groceries & Essentials">Groceries & Essentials</option>
                  <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Store Location / Address
                </label>
                <input 
                  type="text" 
                  name="location"
                  maxLength={60}
                  value={registerData.location} 
                  onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })} 
                  required
                  placeholder="City, Market Area or Pincode"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Aadhaar Card Details (12-digit number)
                </label>
                <input 
                  type="text" 
                  name="aadhaarNumber"
                  maxLength="12"
                  value={registerData.aadhaarNumber} 
                  onChange={(e) => setRegisterData({ ...registerData, aadhaarNumber: e.target.value })} 
                  required
                  placeholder="XXXX XXXX XXXX"
                  style={inputStyle}
                />
              </div>

              {registerError && <p role="alert" style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#b3261e' }}>{registerError}</p>}

              <button type="submit" disabled={busy} className="btn btn-solid" style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '16px' }}>
                {busy ? "Please wait..." : "Send Application for Approval"}
              </button>
            </form>
          </section>
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}