import { useEffect, useState } from "react";
import AuthButton from "./AuthButton.jsx";

// Second step of login: type the 6-digit code that was emailed.
//   onVerify(code)  -> should log the person in (throw an Error to show a message)
//   onResend()      -> asks for a new code
//   onBack()        -> back to the email + password form
// inputStyle / labelStyle / solidClass / ghostClass are only for pages with their own styling (the seller page).
export default function OtpStep({ maskedEmail, message, onVerify, onResend, onBack, inputStyle, labelStyle, solidClass, ghostClass }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(message || "");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.message || "Could not check the code");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    try {
      await onResend();
      setInfo("A new code is on its way.");
      setCode("");
      setWait(30);
    } catch (err) {
      setError(err.message || "Could not send a new code");
    }
  };

  return (
    <form onSubmit={submit}>
      <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", lineHeight: 1.5 }}>
        {info || `Enter the 6-digit code we sent to ${maskedEmail || "your email"}.`}
      </p>
      <label className="field" style={labelStyle}>
        Verification code
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

      {error && <p className="error" role="alert">{error}</p>}

      <AuthButton solid className={solidClass} type="submit" disabled={busy || code.length !== 6} onClick={undefined}>
        {busy ? "Checking..." : "Verify and log in"}
      </AuthButton>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.9rem", fontSize: "0.88rem" }}>
        <button type="button" className="link-btn" onClick={onBack}>
          ← Use a different account
        </button>
        <button type="button" className="link-btn" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}