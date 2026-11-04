import { useRef, useState } from "react";
import GlassButton from "../components/GlassButton.jsx";

const digits = (s, n) => new RegExp("^\\d{" + n + "}$").test(String(s || "").replace(/\s/g, ""));

// Resize + convert a File to a base64 JPEG string (max 400 px, ~40 KB)
function resizeToBase64(file, maxPx = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image could not be loaded.")); };
    img.src = url;
  });
}

export default function DeliveryProfile({ agent, onSave, onToggleDuty, reload }) {
  const [form, setForm] = useState({
    name: agent?.name || "",
    email: agent?.email || "",
    phone: agent?.phone || "",
    vehicleType: agent?.vehicleType || "Two-Wheeler",
    vehicleNumber: agent?.vehicleNumber || "",
    drivingLicense: agent?.drivingLicense || "",
    pincodes: agent?.pincodes || ["700029", "700150"],
    bankName: agent?.bankName || "",
    accountNumber: agent?.accountNumber || "",
    ifscCode: agent?.ifscCode || "",
    dutyStatus: agent?.dutyStatus ?? 1,
    avatar: agent?.avatar || "",   // base64 JPEG or "" for no photo
  });

  const fileRef   = useRef(null);
  const [avatarErr, setAvatarErr] = useState("");

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Avatar picker ────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarErr("");
    if (!file.type.startsWith("image/")) {
      return setAvatarErr("Please choose an image file (JPG, PNG, WEBP…).");
    }
    if (file.size > 5 * 1024 * 1024) {
      return setAvatarErr("Image must be under 5 MB.");
    }
    try {
      const b64 = await resizeToBase64(file);
      setField("avatar", b64);
    } catch {
      setAvatarErr("Could not read the image. Please try another file.");
    }
  };

  const removeAvatar = () => {
    setField("avatar", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const addPincode = () => {
    setPinError("");
    const clean = pinInput.trim();
    if (!digits(clean, 6)) {
      return setPinError("PIN Code must be exactly 6 digits.");
    }
    if (form.pincodes.includes(clean)) {
      return setPinError("That PIN code is already added.");
    }
    setForm((f) => ({ ...f, pincodes: [...f.pincodes, clean] }));
    setPinInput("");
  };

  const removePincode = (pin) => {
    setForm((f) => ({ ...f, pincodes: f.pincodes.filter((p) => p !== pin) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!digits(form.phone, 10)) {
      return setMsg({ type: "error", text: "Mobile number must be 10 digits." });
    }
    if (form.pincodes.length === 0) {
      return setMsg({ type: "error", text: "Please add at least one serviceable PIN code." });
    }

    setBusy(true);
    try {
      await onSave(form);
      setMsg({ type: "ok", text: "Courier profile and delivery area settings saved successfully!" });
      reload();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Failed to save profile." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="dash-stack">
      {/* Duty Status Control Banner */}
      <section className="panel">
        <div className="dash-row between">
          <div>
            <span className="eyebrow">Work Shift Status</span>
            <h3 style={{ fontSize: "1.2rem", color: "var(--cream)" }}>
              {form.dutyStatus === 1 ? "🟢 Available for Delivery Duty" : "🔴 Off-Duty (No Shipments Assigned)"}
            </h3>
            <p className="dash-note left" style={{ margin: "0.2rem 0 0" }}>
              Toggle off when you take breaks or finish your shift.
            </p>
          </div>
          <button
            type="button"
            className={"duty-toggle-btn " + (form.dutyStatus === 1 ? "on" : "off")}
            onClick={async () => {
              await onToggleDuty();
              reload();
            }}
          >
            <span className="duty-indicator" />
            {form.dutyStatus === 1 ? "Switch Off-Duty" : "Switch On-Duty"}
          </button>
        </div>
      </section>

      {/* ── Profile Photo ─────────────────────────────────────────────── */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Visible to customers &amp; admin</em>
          <strong>Profile Photo</strong>
        </h2>
        <p className="dash-note left">
          Your photo helps customers recognise you at the door and builds trust.
          JPG / PNG / WEBP · max 5 MB · auto-resized to 400 px.
        </p>

        <div className="avatar-row">
          {/* Preview circle */}
          <div className="avatar-preview">
            {form.avatar
              ? <img src={form.avatar} alt="Profile preview" />
              : <span className="avatar-placeholder">📷</span>
            }
          </div>

          {/* Controls */}
          <div className="avatar-controls">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              id="avatar-upload"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            <GlassButton
              type="button"
              variant="glass"
              onClick={() => fileRef.current?.click()}
            >
              {form.avatar ? "Change photo" : "Upload photo"}
            </GlassButton>

            {form.avatar && (
              <GlassButton type="button" variant="ghost" onClick={removeAvatar}>
                Remove
              </GlassButton>
            )}

            {avatarErr && (
              <p className="form-msg error" style={{ margin: "0.3rem 0 0" }}>{avatarErr}</p>
            )}
            {form.avatar && (
              <p className="avatar-saved-note">
                ✓ Photo ready — will be saved with your profile
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Account Info */}
      <section className="panel">
        <div className="dash-row between">
          <h2 className="stack-title small">
            <em>Identity credentials</em>
            <strong>Account Details</strong>
          </h2>          <span className="pill" style={{ color: "#86efac" }}>
            Admin Status: {agent?.adminStatus || "APPROVED"}
          </span>
        </div>

        <div className="add-form">
          <div className="two-fields">
            <label className="field">
              Full Name
              <input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Amit Kumar"
              />
            </label>
            <label className="field">
              Email Address
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="courier@vyapari.com"
              />
            </label>
          </div>

          <label className="field">
            Mobile Number (10 digits)
            <input
              required
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="9876543210"
            />
          </label>
        </div>
      </section>

      {/* Logistics & Dynamic Pincodes */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Operational zones</em>
          <strong>Logistics &amp; Service Pincodes</strong>
        </h2>
        <p className="dash-note left">
          You will receive shipment alerts for packages in these operational pincodes.
        </p>

        <div className="add-form">
          <div className="two-fields">
            <label className="field">
              Vehicle Type
              <select
                className="select"
                value={form.vehicleType}
                onChange={(e) => setField("vehicleType", e.target.value)}
              >
                <option value="Two-Wheeler">Two-Wheeler (Motorcycle / Scooter)</option>
                <option value="Three-Wheeler">Three-Wheeler (Auto / Cargo Van)</option>
                <option value="Bicycle">Bicycle</option>
              </select>
            </label>
            <label className="field">
              Vehicle Registration No.
              <input
                value={form.vehicleNumber}
                onChange={(e) => setField("vehicleNumber", e.target.value.toUpperCase())}
                placeholder="e.g. WB-02-4412"
              />
            </label>
          </div>

          <label className="field">
            Driving License Number
            <input
              value={form.drivingLicense}
              onChange={(e) => setField("drivingLicense", e.target.value.toUpperCase())}
              placeholder="e.g. DL-0420110023456"
            />
          </label>

          {/* Dynamic Pincode Component */}
          <div className="field">
            Delivery Area Pincodes
            <div className="pincode-add-row">
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Enter 6-digit PIN code (e.g. 700029)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPincode();
                  }
                }}
              />
              <button type="button" className="btn btn-glass" onClick={addPincode}>
                + Add Area
              </button>
            </div>
            {pinError && <p className="form-msg error" style={{ margin: "0.4rem 0" }}>{pinError}</p>}

            {/* Badge Flex-Row with ✕ icon for added pincodes */}
            <div className="pincode-badges-row">
              {form.pincodes.map((pin) => (
                <span key={pin} className="pincode-pill">
                  📍 {pin}
                  <button
                    type="button"
                    onClick={() => removePincode(pin)}
                    aria-label={`Remove pincode ${pin}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Financial Details */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Remittance account</em>
          <strong>Bank Account Details (For Payouts)</strong>
        </h2>
        <div className="add-form">
          <label className="field">
            Bank Name
            <input
              required
              value={form.bankName}
              onChange={(e) => setField("bankName", e.target.value)}
              placeholder="e.g. Punjab National Bank / State Bank of India"
            />
          </label>

          <div className="two-fields">
            <label className="field">
              Account Number
              <input
                required
                value={form.accountNumber}
                onChange={(e) => setField("accountNumber", e.target.value)}
                placeholder="e.g. 0234001500098765"
              />
            </label>
            <label className="field">
              IFSC Code
              <input
                required
                maxLength={11}
                value={form.ifscCode}
                onChange={(e) => setField("ifscCode", e.target.value.toUpperCase())}
                placeholder="e.g. PUNB0023400"
              />
            </label>
          </div>

          {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}

          <GlassButton type="submit" variant="solid" disabled={busy}>
            {busy ? "Saving Settings..." : "Save Delivery Profile"}
          </GlassButton>
        </div>
      </section>
    </form>
  );
}
