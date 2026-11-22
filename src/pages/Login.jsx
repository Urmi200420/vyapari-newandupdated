import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GlassButton from "../components/GlassButton.jsx";
import { login, register, homeFor, verifyLoginOtp } from "../api/auth.js";
import OtpStep from "../components/OtpStep.jsx";
import ForgotPassword from "../components/ForgotPassword.jsx";

// Special doors, opened from the sidebar:  /login?role=seller   /login?role=delivery   /login?role=admin
// canSignup: seller and delivery partners can apply here, admin accounts cannot
const DOORS = {
  admin: {
    hello: "Staff access",
    title: "Admin login",
    tagline: "Manage items, stock, orders and sellers.",
    canSignup: false,
  },
  delivery: {
    hello: "Delivery partner",
    title: "Delivery portal",
    tagline: "Log in, or apply to deliver orders. An admin approves new partners.",
    canSignup: true,
  },
  seller: {
    hello: "Seller",
    title: "Seller portal",
    tagline: "Log in, or register your shop. An admin approves new sellers.",
    canSignup: true,
  },
};

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // "admin", "delivery", "seller", or null for the normal customer login.
  // (join=delivery is the older link style and still works)
  const asked = params.get("role") || params.get("join");
  const doorRole = DOORS[asked] ? asked : null;
  const door = doorRole ? DOORS[doorRole] : null;
  const canSignup = !door || door.canSignup;

  const [mode, setMode] = useState(canSignup && params.get("mode") === "signup" ? "signup" : "login");
  const [pickedRole, setPickedRole] = useState("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("form"); // "form" or "forgot"
  const [otp, setOtp] = useState(null); // set when a code was emailed and we wait for it

  // on a seller / delivery door the role is fixed; on the normal page the person chooses
  const role = doorRole === "seller" || doorRole === "delivery" ? doorRole : pickedRole;

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setNotice("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await register({ name, email, phone, password, role, ...(role === "seller" ? { shopName, city } : {}) });
        if (role === "seller" || role === "delivery") {
          // sellers and delivery partners must wait for the admin, so they are not logged in yet
          setNotice(
            role === "seller"
              ? "Application sent! You can log in as soon as an admin approves your shop."
              : "Application sent! You can log in as soon as an admin approves your delivery account."
          );
          setMode("login");
          setPassword("");
          return;
        }
        // customers can start straight away
      }
      const user = await login({ email, password, ...(doorRole ? { role: doorRole } : {}) });
      if (user.otpRequired) {
        // customers and sellers: a code was emailed, ask for it
        setOtp(user);
        return;
      }
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message || "Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <GlassButton to="/" className="back">
          ← Back to browsing
        </GlassButton>

        <h1 className={"stack-title auth-title" + (door ? " staff" : "")}>
          {door ? (
            <>
              <em>{door.hello}</em>
              <strong>{door.title}</strong>
            </>
          ) : (
            <>
              <em>{mode === "login" ? "Welcome back to" : "Come join"}</em>
              <strong>Vyapari</strong>
            </>
          )}
        </h1>
        <p className="tagline">{door ? door.tagline : "Buy anything. Sell everything."}</p>

        {canSignup && !otp && view === "form" && (
          <div className="tabs">
            <button type="button" className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => switchMode("signup")}>
              {door ? (doorRole === "seller" ? "Register as seller" : "Apply to deliver") : "Sign up"}
            </button>
          </div>
        )}

        {otp ? (
          <OtpStep
            maskedEmail={otp.maskedEmail}
            message={otp.message}
            onVerify={async (code) => {
              const user = await verifyLoginOtp({ email: otp.email, code, ...(doorRole ? { role: doorRole } : {}) });
              navigate(homeFor(user.role));
            }}
            onResend={() => login({ email, password, ...(doorRole ? { role: doorRole } : {}) })}
            onBack={() => {
              setOtp(null);
              setPassword("");
            }}
          />
        ) : view === "forgot" ? (
          <ForgotPassword initialEmail={email} onBack={() => setView("form")} />
        ) : (
        <form onSubmit={submit}>
          {/* only the normal page lets people choose what they are */}
          {mode === "signup" && !door && (
            <div className="roles">
              <label className={pickedRole === "customer" ? "on" : ""}>
                <input type="radio" name="role" checked={pickedRole === "customer"} onChange={() => setPickedRole("customer")} />
                🛒 I want to buy
              </label>
              <label className={pickedRole === "seller" ? "on" : ""}>
                <input type="radio" name="role" checked={pickedRole === "seller"} onChange={() => setPickedRole("seller")} />
                🏪 I want to sell
              </label>
              <label className={pickedRole === "delivery" ? "on" : ""}>
                <input type="radio" name="role" checked={pickedRole === "delivery"} onChange={() => setPickedRole("delivery")} />
                🚴 I want to deliver
              </label>
            </div>
          )}

          {mode === "signup" && (
            <>
              <label className="field">
                Full name
                <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              </label>
              <label className="field">
                Mobile number
                <input
                  required
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10 digits"
                  autoComplete="tel-national"
                />
              </label>
              {role === "seller" && (
                <>
                  <label className="field">
                    Shop name
                    <input required minLength={2} maxLength={80} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Green Basket Market" />
                  </label>
                  <label className="field">
                    City
                    <input maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Kolkata" />
                  </label>
                </>
              )}
            </>
          )}

          <label className="field">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {mode === "login" && doorRole !== "admin" && doorRole !== "delivery" && (
            <p style={{ margin: "-0.4rem 0 0.8rem", fontSize: "0.86rem", textAlign: "right" }}>
              <button type="button" className="link-btn" onClick={() => { setError(""); setNotice(""); setView("forgot"); }}>
                Forgot password?
              </button>
            </p>
          )}

          {notice && <p className="success" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}

          <GlassButton type="submit" variant="solid" block disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : doorRole === "seller" ? "Send application" : doorRole === "delivery" ? "Send application" : "Create account"}
          </GlassButton>
        </form>
        )}

        {door && (
          <p className="staff-switch">
            Not {doorRole === "admin" ? "staff" : "a " + doorRole}? <Link to="/login">Customer login</Link>
          </p>
        )}
      </div>
    </div>
  );
}