import { useState } from "react";
import { getProfile, saveProfile } from "../api/sellerProfile.js";
import GlassButton from "../components/GlassButton.jsx";
import { useAsync, Loading, ErrorNote } from "./parts.jsx";

const digits = (s, n) => new RegExp("^\\d{" + n + "}$").test(String(s || "").replace(/\s/g, ""));
const isGstin = (s) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(s) || /^[A-Z0-9]{15}$/i.test(s);

export default function Profile() {
  const { data, error, reload } = useAsync(getProfile);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading your shop profile..." />;
  return <ProfileForm initial={data} />;
}

function ProfileForm({ initial }) {
  const [shop, setShop] = useState({
    ownerName: initial.ownerName || "",
    shopName: initial.shopName || "",
    phone: initial.phone || "",
    email: initial.email || "",
    description: initial.description || "",
    gstin: initial.gstin || "",
    pickup: {
      contactPerson: initial.pickup?.contactPerson || "",
      contactPhone: initial.pickup?.contactPhone || "",
      houseNumber: initial.pickup?.houseNumber || "",
      streetAddress: initial.pickup?.streetAddress || initial.pickup?.line1 || "",
      landmark: initial.pickup?.landmark || "",
      city: initial.pickup?.city || "",
      state: initial.pickup?.state || "",
      pincode: initial.pickup?.pincode || "",
      hours: initial.pickup?.hours || "10:00 am - 7:00 pm, Mon to Sat",
    },
    bank: {
      bankName: initial.bank?.bankName || "",
      accountNumber: initial.bank?.accountNumber || "",
      ifscCode: initial.bank?.ifscCode || "",
    },
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setTop = (k, v) => setShop((s) => ({ ...s, [k]: v }));
  const setPick = (k, v) => setShop((s) => ({ ...s, pickup: { ...s.pickup, [k]: v } }));
  const setBank = (k, v) => setShop((s) => ({ ...s, bank: { ...s.bank, [k]: v } }));

  const p = shop.pickup;
  const b = shop.bank;

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!digits(shop.phone, 10)) return setMsg({ type: "error", text: "Shop contact phone must be 10 digits." });
    if (!digits(p.contactPhone, 10)) return setMsg({ type: "error", text: "Pickup contact phone must be 10 digits." });
    if (!digits(p.pincode, 6)) return setMsg({ type: "error", text: "Pickup PIN code must be exactly 6 digits." });

    if (shop.gstin && shop.gstin.trim().length !== 15) {
      return setMsg({ type: "error", text: "GSTIN / Tax ID must be a 15-character alphanumeric code." });
    }
    if (b.accountNumber && b.accountNumber.trim().length < 8) {
      return setMsg({ type: "error", text: "Please enter a valid bank account number." });
    }
    if (b.ifscCode && b.ifscCode.trim().length < 4) {
      return setMsg({ type: "error", text: "Please enter a valid Bank IFSC code." });
    }

    setBusy(true);
    try {
      await saveProfile(shop);
      setMsg({ type: "ok", text: "Shop profile, pickup address, and bank settings saved successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not save profile details." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="dash-stack">
      {/* 1. Shop & Owner Profile */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Business credentials</em>
          <strong>Shop &amp; Owner Profile</strong>
        </h2>
        <div className="add-form">
          <div className="two-fields">
            <label className="field">
              Owner's full name
              <input
                required
                maxLength={60}
                value={shop.ownerName}
                onChange={(e) => setTop("ownerName", e.target.value)}
                placeholder="e.g. Suresh Agarwal"
              />
              <span className="field-hint">Primary account holder</span>
            </label>
            <label className="field">
              Business / Store name
              <input
                required
                maxLength={60}
                value={shop.shopName}
                onChange={(e) => setTop("shopName", e.target.value)}
                placeholder="e.g. Green Basket Traders"
              />
              <span className="field-hint">Public brand name shown to buyers</span>
            </label>
          </div>

          <div className="two-fields">
            <label className="field">
              Contact phone
              <input
                required
                inputMode="numeric"
                value={shop.phone}
                onChange={(e) => setTop("phone", e.target.value)}
                placeholder="10 digits"
              />
            </label>
            <label className="field">
              Contact email
              <input required type="email" readOnly value={shop.email} onChange={(e) => setTop("email", e.target.value)} />
              
            </label>
          </div>

          <label className="field">
            Business description
            <textarea
              rows="3"
              maxLength={400}
              value={shop.description}
              onChange={(e) => setTop("description", e.target.value)}
              placeholder="Tell buyers what you sell and what makes your catalog special..."
            />
          </label>

          <label className="field">
            GSTIN / Generic Tax ID
            <input
              maxLength={15}
              value={shop.gstin}
              onChange={(e) => setTop("gstin", e.target.value.toUpperCase())}
              placeholder="e.g. 19AAACG1234M1Z5 (15 characters)"
            />
            <span className="field-hint">15-character alphanumeric tax identifier</span>
          </label>
        </div>
      </section>

      {/* 2. Pickup Address Configuration */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Fulfillment hub</em>
          <strong>Pickup Address Configuration</strong>
        </h2>
        <p className="dash-note left">
          Delivery personnel arrive at this exact warehouse or storefront address to collect packed packages.
        </p>

        <div className="add-form">
          <div className="two-fields">
            <label className="field">
              Pickup contact person
              <input
                required
                value={p.contactPerson}
                onChange={(e) => setPick("contactPerson", e.target.value)}
                placeholder="Manager or warehouse dispatch"
              />
            </label>
            <label className="field">
              Contact phone
              <input
                required
                inputMode="numeric"
                value={p.contactPhone}
                onChange={(e) => setPick("contactPhone", e.target.value)}
                placeholder="10 digits"
              />
            </label>
          </div>

          <div className="two-fields">
            <label className="field">
              House / Unit / Plot number
              <input
                value={p.houseNumber}
                onChange={(e) => setPick("houseNumber", e.target.value)}
                placeholder="e.g. Unit 4B / Shed 12"
              />
            </label>
            <label className="field">
              Street address
              <input
                required
                value={p.streetAddress}
                onChange={(e) => setPick("streetAddress", e.target.value)}
                placeholder="e.g. Lake Road Industrial Area"
              />
            </label>
          </div>

          <label className="field">
            Landmark
            <input
              value={p.landmark}
              onChange={(e) => setPick("landmark", e.target.value)}
              placeholder="Prominent nearby landmark for delivery drivers"
            />
          </label>

          <div className="three-fields">
            <label className="field">
              City
              <input required value={p.city} onChange={(e) => setPick("city", e.target.value)} placeholder="Kolkata" />
            </label>
            <label className="field">
              State
              <input required value={p.state} onChange={(e) => setPick("state", e.target.value)} placeholder="West Bengal" />
            </label>
            <label className="field">
              PIN code
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={p.pincode}
                onChange={(e) => setPick("pincode", e.target.value)}
                placeholder="6 digits"
              />
            </label>
          </div>

          <label className="field">
            Daily pickup hours
            <input
              value={p.hours}
              onChange={(e) => setPick("hours", e.target.value)}
              placeholder="e.g. 10:00 am - 7:00 pm, Monday to Saturday"
            />
          </label>
        </div>
      </section>

      {/* 3. Bank Account Details (For Payouts) */}
      <section className="panel">
        <h2 className="stack-title small">
          <em>Commercial settlement</em>
          <strong>Bank Account Details (For Payouts)</strong>
        </h2>
        <p className="dash-note left">Admin settles your net sales earnings (90%) directly to this bank account.</p>

        <div className="add-form">
          <label className="field">
            Bank Name
            <input
              required
              value={b.bankName}
              onChange={(e) => setBank("bankName", e.target.value)}
              placeholder="e.g. State Bank of India / HDFC Bank"
            />
          </label>

          <div className="two-fields">
            <label className="field">
              Account Number
              <input
                required
                value={b.accountNumber}
                onChange={(e) => setBank("accountNumber", e.target.value)}
                placeholder="e.g. 309812345678"
              />
            </label>
            <label className="field">
              IFSC Code
              <input
                required
                maxLength={11}
                value={b.ifscCode}
                onChange={(e) => setBank("ifscCode", e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
              />
            </label>
          </div>

          {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}

          <GlassButton type="submit" variant="solid" disabled={busy}>
            {busy ? "Saving updates..." : "Save all shop & business settings"}
          </GlassButton>
        </div>
      </section>
    </form>
  );
}
