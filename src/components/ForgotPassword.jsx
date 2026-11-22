import { useState } from "react";
import { forgotPassword, resetPassword } from "../api/auth.js";
import AuthButton from "./AuthButton.jsx";

// Forgot password in three small steps: email -> code + new password -> done.
//   onBack()  -> back to the login form
// inputStyle / labelStyle / solidClass / ghostClass are only for pages with their own styling (the seller page).
export default function ForgotPassword({ initialEmail = "", onBack, inputStyle, labelStyle, solidClass, ghostClass }) {
  const [step, setStep] = useState("email"); // email | reset | done
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await forgotPassword(email.trim());
      setInfo(res.message || "We sent a 6-digit code to your email.");
      setStep("reset");
    } catch (err) {
      setError(err.message || "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== again) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      await resetPassword({ email: email.trim(), code, newPassword: password });
      setStep("done");
    } catch (err) {
      setError(err.message || "Could not change the password");
    } finally {
      setBusy(false);
    }
  };

  if (step === "done") {
    return (
      <div>
        <p className="success" role="status">Password changed. You can log in with your new password now.</p>
        <AuthButton solid className={solidClass} onClick={onBack}>
          Back to log in
        </AuthButton>
      </div>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode}>
        <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", lineHeight: 1.5 }}>
          Enter the email you registered with. We will send you a 6-digit code.
        </p>
        <label className="field" style={labelStyle}>
          Email
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <AuthButton solid className={solidClass} type="submit" disabled={busy} onClick={undefined}>
          {busy ? "Sending..." : "Send code"}
        </AuthButton>
        <p style={{ marginTop: "0.9rem", fontSize: "0.88rem" }}>
          <button type="button" className="link-btn" onClick={onBack}>
            ← Back to log in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={reset}>
      <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", lineHeight: 1.5 }}>{info}</p>
      <label className="field" style={labelStyle}>
        6-digit code
        <input
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          title="6 digits"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="------"
          style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: "1.2rem", ...inputStyle }}
        />
      </label>
      <label className="field" style={labelStyle}>
        New password
        <input type="password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" style={inputStyle} />
      </label>
      <label className="field" style={labelStyle}>
        Type it again
        <input type="password" required minLength={8} maxLength={72} value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Same password" autoComplete="new-password" style={inputStyle} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <AuthButton solid className={solidClass} type="submit" disabled={busy || code.length !== 6} onClick={undefined}>
        {busy ? "Saving..." : "Change password"}
      </AuthButton>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.9rem", fontSize: "0.88rem" }}>
        <button type="button" className="link-btn" onClick={onBack}>
          ← Back to log in
        </button>
        <button type="button" className="link-btn" onClick={sendCode} disabled={busy}>
          Send a new code
        </button>
      </div>
    </form>
  );
}