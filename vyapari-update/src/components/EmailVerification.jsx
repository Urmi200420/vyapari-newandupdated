import { useEffect, useState } from "react";
import { sendEmailCode, verifyEmailCode } from "../api/auth.js";

// "Send code" -> 6-digit code from the e-mail -> "Verify". Calls onVerified(token) on success.
// The token belongs to this exact e-mail address: the parent clears it when the address changes.
export default function EmailVerification({ email, purpose, token, onVerified }) {
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(0);
  const clean = email.trim().toLowerCase();
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean);

  // a different address needs a new code
  useEffect(() => {
    if (sentTo && sentTo !== clean) {
      setSentTo("");
      setCode("");
      setInfo("");
      setError("");
    }
  }, [clean, sentTo]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setError("");
    setInfo("");
    if (!validEmail) return setError("Enter a valid email address first.");
    setBusy(true);
    try {
      const r = await sendEmailCode({ email: clean, purpose });
      setSentTo(clean);
      setCode("");
      setWait(r.resendInSeconds || 60);
      setInfo(`We sent a 6-digit code to ${clean}. It expires in ${Math.round((r.expiresInSeconds || 600) / 60)} minutes. Check your spam folder if it does not arrive.`);
    } catch (e) {
      setError(e.message);
      const s = /wait (\d+) seconds/.exec(e.message);
      if (s) setWait(Number(s[1]));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from the email.");
    setBusy(true);
    try {
      const r = await verifyEmailCode({ email: clean, purpose, code });
      setInfo("");
      onVerified(r.verificationToken);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (token) {
    return <p className="success email-verified" role="status">✓ Email verified: {clean}</p>;
  }

  return (
    <div className="field email-verify-field">
      <span>Email verification *</span>
      {!sentTo ? (
        <div className="document-capture-actions">
          <button type="button" className="delivery-secondary-btn" onClick={send} disabled={busy || !validEmail}>
            {busy ? "Sending…" : "Send verification code"}
          </button>
        </div>
      ) : (
        <>
          <div className="email-verify-row">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              placeholder="6-digit code"
              aria-label="Verification code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  verify();
                }
              }}
            />
            <button type="button" className="delivery-secondary-btn" onClick={verify} disabled={busy}>
              {busy ? "Checking…" : "Verify"}
            </button>
          </div>
          <button type="button" className="delivery-secondary-btn email-resend" onClick={send} disabled={busy || wait > 0}>
            {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </button>
        </>
      )}
      {info && <small className="delivery-helper">{info}</small>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
