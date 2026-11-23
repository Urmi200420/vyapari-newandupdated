import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GlassButton from "../components/GlassButton.jsx";
import DocumentCapture from "../components/DocumentCapture.jsx";
import EmailVerification from "../components/EmailVerification.jsx";
import { login, register, registerDeliveryApplication, checkDeliveryContact, homeFor } from "../api/auth.js";

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
  const [deliveryStep, setDeliveryStep] = useState(0);
  const [deliveryReady, setDeliveryReady] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    dateOfBirth: "", address: "", deliveryCity: "", pincode: "", emergencyContact: "",
    identityType: "", identityName: "", identityNumber: "", vehicleType: "", vehicleOtherName: "",
    vehicleNumber: "", drivingLicenceNumber: "", availability: "", experience: "",
    workingDays: [], workingHours: "", servicePincodes: ""
  });
  const [deliveryDocuments, setDeliveryDocuments] = useState({ identity: null, licence: null, vehicleRc: null });
  const setDeliveryDocument = (key, value) => setDeliveryDocuments((current) => ({ ...current, [key]: value }));
  const [email, setEmail] = useState("");
  // token from the e-mailed 6-digit code; only valid for the address it was issued for
  const [emailToken, setEmailToken] = useState(null);
  const changeEmail = (value) => {
    setEmail(value);
    setEmailToken(null);
  };
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // on a seller / delivery door the role is fixed; on the normal page the person chooses
  const role = doorRole === "seller" || doorRole === "delivery" ? doorRole : pickedRole;

  // Temporary demo mode: skip the login screen and open the selected role dashboard.
  // Signup remains available for the delivery onboarding form.
  useEffect(() => {
    if (import.meta.env.VITE_REAL_AUTH !== "true" && !((doorRole === "delivery" && import.meta.env.VITE_REAL_DELIVERY_AUTH === "true") || (doorRole === "admin" && import.meta.env.VITE_REAL_ADMIN_AUTH === "true")) && mode === "login") {
      navigate(homeFor(doorRole || pickedRole), { replace: true });
    }
  }, [mode, doorRole, pickedRole, navigate]);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setNotice("");
    setDeliveryStep(0);
    setDeliveryReady(false);
  };

  const updateDelivery = (key, value) => setDeliveryForm((current) => ({ ...current, [key]: value }));
  const toggleWorkingDay = (day) => setDeliveryForm((current) => ({
    ...current,
    workingDays: current.workingDays.includes(day)
      ? current.workingDays.filter((item) => item !== day)
      : [...current.workingDays, day],
  }));

  // Same rules as AuthService.validateDeliveryApplication on the server. Returns "" or what to fix.
  const deliveryStepProblem = (step = deliveryStep) => {
    const f = deliveryForm;
    const mobile = /^[6-9][0-9]{9}$/;
    if (step === 0) {
      if (name.trim().length < 2) return "Please enter your full name.";
      if (!mobile.test(phone)) return "Enter a valid 10-digit mobile number.";
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email address.";
      if (!emailToken) return "Please verify your email address with the 6-digit code we email you.";
      if (password.length < 8) return "Password must be 8 to 72 characters.";
      if (!f.dateOfBirth) return "Please enter your date of birth.";
      const dob = new Date(f.dateOfBirth + "T00:00:00");
      const adult = new Date(); adult.setFullYear(adult.getFullYear() - 18);
      if (Number.isNaN(dob.getTime()) || dob > adult) return "Delivery partners must be at least 18 years old.";
      if (!f.address.trim()) return "Please enter your residential address.";
      if (!f.deliveryCity.trim()) return "Please enter your city.";
      if (!/^[1-9][0-9]{5}$/.test(f.pincode)) return "Enter a valid 6-digit PIN code.";
      if (!mobile.test(f.emergencyContact)) return "Enter a valid 10-digit emergency contact number.";
      if (f.emergencyContact === phone) return "Emergency contact must be different from your own mobile number.";
      return "";
    }
    if (step === 1) {
      if (!f.identityType) return "Please choose your identity document type.";
      if (f.identityType === "OTHER" && !f.identityName.trim()) return "Please specify the government ID type.";
      if (!/^[A-Za-z0-9 /-]{4,40}$/.test(f.identityNumber.trim())) return "Enter a valid identity document number (4–40 letters or digits).";
      if (!deliveryDocuments.identity) return "Please upload or capture your identity document.";
      return "";
    }
    if (step === 2) {
      if (!f.vehicleType) return "Please choose your vehicle type.";
      if (f.vehicleType === "OTHER" && !f.vehicleOtherName.trim()) return "Please specify your vehicle type.";
      if (f.vehicleType === "BICYCLE") return "";
      if (!/^[A-Za-z0-9 -]{4,20}$/.test(f.vehicleNumber.trim())) return "Enter a valid vehicle registration number.";
      if (!/^[A-Za-z0-9 /-]{5,30}$/.test(f.drivingLicenceNumber.trim())) return "Enter a valid driving licence number.";
      if (!deliveryDocuments.licence) return "Please upload or capture your driving licence.";
      if (!deliveryDocuments.vehicleRc) return "Please upload or capture your vehicle RC.";
      return "";
    }
    if (!f.availability) return "Please choose your availability preference.";
    if (!f.experience) return "Please choose your delivery experience.";
    if (!f.workingHours) return "Please choose your preferred working hours.";
    if (!f.workingDays.length) return "Choose at least one working day.";
    const pins = f.servicePincodes.split(/[\s,]+/).filter(Boolean);
    if (!pins.length) return "Add at least one serviceable PIN code.";
    if (pins.some((p) => !/^[1-9][0-9]{5}$/.test(p))) return "Serviceable PIN codes must be 6-digit numbers separated by commas.";
    if (new Set(pins).size > 20) return "You can add up to 20 serviceable PIN codes.";
    return "";
  };

  const nextDeliveryStep = async () => {
    setError("");
    const problem = deliveryStepProblem();
    if (problem) {
      setError(problem);
      return;
    }
    if (deliveryStep === 0) {
      // report an already-registered email / mobile now, not after all four steps
      setBusy(true);
      try {
        await checkDeliveryContact({ email, phone });
      } catch (err) {
        setError(err.message);
        return;
      } finally {
        setBusy(false);
      }
    }
    setDeliveryStep((step) => Math.min(step + 1, 3));
  };

  const finishDeliveryDetails = () => {
    setError("");
    setNotice("");
    const problem = deliveryStepProblem(3);
    if (problem) return setError(problem);
    setDeliveryReady(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "login" && import.meta.env.VITE_REAL_AUTH !== "true" && !((doorRole === "delivery" && import.meta.env.VITE_REAL_DELIVERY_AUTH === "true") || (doorRole === "admin" && import.meta.env.VITE_REAL_ADMIN_AUTH === "true"))) {
        navigate(homeFor(doorRole || pickedRole));
        return;
      }
      if (mode === "signup") {
        if (role === "customer" && !emailToken) {
          setError("Please verify your email address with the 6-digit code we email you.");
          return;
        }
        await register({ name, email, phone, password, role, ...(role === "seller" ? { shopName, city } : {}), ...(role === "customer" ? { emailVerificationToken: emailToken } : {}) });
        setEmailToken(null);
        if (role === "seller" || role === "delivery") {
          setNotice(role === "seller"
            ? "Application sent! You can log in as soon as an admin approves your shop."
            : "Application sent! You can log in as soon as an admin approves your delivery account.");
          setMode("login");
          setPassword("");
          return;
        }
      }
      const user = await login({ email, password, ...(doorRole ? { role: doorRole } : {}) });
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message || "Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  const submitDeliveryApplication = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      await registerDeliveryApplication({
        name, email, phone, password,
        dateOfBirth: deliveryForm.dateOfBirth, address: deliveryForm.address, city: deliveryForm.deliveryCity,
        pincode: deliveryForm.pincode, emergencyContact: deliveryForm.emergencyContact,
        identityDocumentType: deliveryForm.identityType,
        identityDocumentName: deliveryForm.identityType === "OTHER" ? deliveryForm.identityName : "",
        identityDocumentNumber: deliveryForm.identityNumber,
        vehicleType: deliveryForm.vehicleType, vehicleOtherName: deliveryForm.vehicleType === "OTHER" ? deliveryForm.vehicleOtherName : "",
        vehicleNumber: deliveryForm.vehicleType === "BICYCLE" ? "" : deliveryForm.vehicleNumber,
        drivingLicenseNumber: deliveryForm.vehicleType === "BICYCLE" ? "" : deliveryForm.drivingLicenceNumber,
        availabilityPreference: deliveryForm.availability, deliveryExperience: deliveryForm.experience,
        workingDays: deliveryForm.workingDays.join(","), workingHours: deliveryForm.workingHours,
        serviceablePincodes: deliveryForm.servicePincodes,
        documents: deliveryDocuments,
        emailVerificationToken: emailToken,
      });
      setNotice("Application submitted successfully. Your account is pending admin verification. You can log in after approval.");
      setDeliveryReady(false); setPassword(""); setDeliveryStep(0); setEmailToken(null);
      // do not keep identity details or document images in memory after submission
      setDeliveryDocuments({ identity: null, licence: null, vehicleRc: null });
      setDeliveryForm((current) => ({ ...current, identityNumber: "", drivingLicenceNumber: "" }));
      setMode("login");
    } catch (err) {
      // an expired / used verification means the applicant has to confirm the e-mail again on step 1
      if (/verif/i.test(err.message || "")) setEmailToken(null);
      setError(err.message || "Could not submit your application.");
    }
    finally { setBusy(false); }
  };

  if (mode === "signup" && doorRole === "delivery") {
    const steps = ["Personal details", "Identity verification", "Vehicle details", "Delivery preferences"];
    const field = (label, key, placeholder = "", type = "text", props = {}) => (
      <label className="field" key={key}>{label}
        <input type={type} value={deliveryForm[key]} onChange={(e) => updateDelivery(key, e.target.value)} placeholder={placeholder} {...props} />
      </label>
    );
    const selectField = (label, key, options, placeholder) => (
      <label className="field" key={key}>{label}
        <select required value={deliveryForm[key]} onChange={(e) => updateDelivery(key, e.target.value)}>
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}
        </select>
      </label>
    );

    return (
      <div className="auth-page">
        <div className="auth-card delivery-apply-card">
          <GlassButton to="/" className="back">← Back to browsing</GlassButton>
          <h1 className="stack-title auth-title staff"><em>Become a</em><strong>Delivery Partner</strong></h1>
          <p className="tagline">Complete your details to apply for delivery access.</p>
          <div className="delivery-progress" aria-label={`Step ${deliveryStep + 1} of 4`}>
            <div className="delivery-progress-track"><span style={{ width: `${((deliveryStep + 1) / 4) * 100}%` }} /></div>
            <div className="delivery-progress-label"><span>Step {deliveryStep + 1} of 4</span><strong>{steps[deliveryStep]}</strong></div>
          </div>
          <form autoComplete="off" noValidate onSubmit={(e) => { e.preventDefault(); if (busy) return; if (deliveryStep < 3) nextDeliveryStep(); else finishDeliveryDetails(); }}>
            {deliveryStep === 0 && <>
              <h3 className="delivery-form-heading">Personal information</h3>
              <label className="field">Full name<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="name" /></label>
              <label className="field">Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile number" autoComplete="tel-national" /></label>
              <label className="field">Email address<input required type="email" value={email} onChange={(e) => changeEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
              <EmailVerification email={email} purpose="DELIVERY_REGISTRATION" token={emailToken} onVerified={(t) => { setEmailToken(t); setError(""); }} />
              <label className="field">Password<input required type="password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
              {field("Date of birth", "dateOfBirth", "", "date", { required: true })}
              {field("Residential address", "address", "House / street / locality", "text", { required: true, maxLength: 250, name: "delivery-residential-address", autoComplete: "new-password", spellCheck: false })}
              <div className="delivery-form-grid">
                {field("City", "deliveryCity", "e.g. Kolkata", "text", { required: true, maxLength: 60, name: "delivery-city", autoComplete: "off" })}
                {field("PIN code", "pincode", "6-digit PIN code", "text", { required: true, inputMode: "numeric", maxLength: 6, pattern: "[0-9]{6}" })}
              </div>
              {field("Emergency contact number", "emergencyContact", "10-digit mobile number", "tel", { required: true, inputMode: "numeric", maxLength: 10, pattern: "[6-9][0-9]{9}" })}
            </>}
            {deliveryStep === 1 && <>
              <h3 className="delivery-form-heading">Identity verification</h3>
              {selectField("Identity document type", "identityType", [["AADHAAR","Aadhaar (masked / VID preferred)"],["VOTER_ID","Voter ID"],["DRIVING_LICENCE","Driving Licence"],["PASSPORT","Passport"],["OTHER","Other Government ID"]])}
              {deliveryForm.identityType === "OTHER" && field("Government ID name", "identityName", "e.g. PAN Card", "text", { required: true, maxLength: 80 })}
              {field("Identity document number", "identityNumber", "Enter document number", "text", { required: true, maxLength: 40, autoComplete: "off" })}
              <DocumentCapture label="Identity supporting document" value={deliveryDocuments.identity} onChange={(value) => setDeliveryDocument("identity", value)} required />
              <p className="delivery-helper">Your identity details will be used only for delivery-partner verification.</p>
            </>}
            {deliveryStep === 2 && <>
              <h3 className="delivery-form-heading">Vehicle information</h3>
              {selectField("Vehicle type", "vehicleType", [["MOTORCYCLE","Motorcycle"],["SCOOTER","Scooter"],["BICYCLE","Bicycle"],["ELECTRIC_SCOOTER","Electric Scooter"],["OTHER","Other"]])}
              {deliveryForm.vehicleType === "OTHER" && field("Specify vehicle type", "vehicleOtherName", "Enter your vehicle type", "text", { required: true, maxLength: 50 })}
              {deliveryForm.vehicleType !== "BICYCLE" && <>
                {field("Vehicle registration number", "vehicleNumber", "e.g. WB 12 AB 1234", "text", { required: true, maxLength: 20, style: { textTransform: "uppercase" } })}
                {field("Driving licence number", "drivingLicenceNumber", "Enter driving licence number", "text", { required: true, maxLength: 30 })}
              </>}
              {deliveryForm.vehicleType === "BICYCLE" && <p className="delivery-helper">A registration number and driving licence are not required for a regular bicycle.</p>}
              {deliveryForm.vehicleType !== "BICYCLE" && <><DocumentCapture label="Driving licence document" value={deliveryDocuments.licence} onChange={(value) => setDeliveryDocument("licence", value)} required /><DocumentCapture label="Vehicle RC document" value={deliveryDocuments.vehicleRc} onChange={(value) => setDeliveryDocument("vehicleRc", value)} required /></>}
            </>}
            {deliveryStep === 3 && <>
              <h3 className="delivery-form-heading">Delivery preferences</h3>
              {selectField("Availability preference", "availability", [["FULL_TIME","Full Time"],["PART_TIME","Part Time"],["FLEXIBLE","Flexible Hours"]])}
              {selectField("Delivery experience", "experience", [["FRESHER","Fresher"],["UNDER_1_YEAR","Less than 1 year"],["1_TO_3_YEARS","1–3 years"],["3_TO_5_YEARS","3–5 years"],["OVER_5_YEARS","5+ years"]])}
              {selectField("Preferred working hours", "workingHours", [["MORNING","Morning"],["AFTERNOON","Afternoon"],["EVENING","Evening"],["FLEXIBLE","Flexible"]])}
              <div className="field"><span>Preferred working days</span><details className="delivery-day-dropdown"><summary>{deliveryForm.workingDays.length ? deliveryForm.workingDays.join(", ") : "Choose one or more days"}</summary><div className="delivery-days">{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day) => <label key={day} className={deliveryForm.workingDays.includes(day) ? "selected" : ""}><input type="checkbox" checked={deliveryForm.workingDays.includes(day)} onChange={() => toggleWorkingDay(day)} />{day.slice(0,3)}</label>)}</div></details></div>
              {field("Serviceable PIN codes", "servicePincodes", "Enter PIN codes separated by commas", "text", { required: true, maxLength: 120 })}
            </>}
            {notice && <p className="success" role="status">{notice}</p>}
            {error && <p className="error" role="alert">{error}</p>}
            {deliveryReady ? <div className="delivery-ready-panel"><strong>Registration details captured</strong><p>Review your information before submitting your application for admin verification.</p><dl className="delivery-review-list"><div><dt>Applicant</dt><dd>{name}</dd></div><div><dt>Contact</dt><dd>{email} · {phone}</dd></div><div><dt>Location</dt><dd>{deliveryForm.deliveryCity}, {deliveryForm.pincode}</dd></div><div><dt>Identity</dt><dd>{deliveryForm.identityType === "OTHER" ? deliveryForm.identityName : deliveryForm.identityType.replaceAll("_", " ")}</dd></div><div><dt>Vehicle</dt><dd>{deliveryForm.vehicleType === "OTHER" ? deliveryForm.vehicleOtherName : deliveryForm.vehicleType.replaceAll("_", " ")}</dd></div><div><dt>Availability</dt><dd>{deliveryForm.availability.replaceAll("_", " ")}</dd></div></dl><div className="delivery-form-actions"><button type="button" className="delivery-secondary-btn" onClick={() => { setDeliveryReady(false); setNotice(""); setDeliveryStep(0); }}>Review / edit details</button><GlassButton type="button" variant="solid" onClick={submitDeliveryApplication} disabled={busy}>{busy ? "Submitting..." : "Submit application"}</GlassButton></div></div> : <div className="delivery-form-actions">
              {deliveryStep > 0 && <button type="button" className="delivery-secondary-btn" onClick={() => { setError(""); setDeliveryStep((step) => step - 1); }}>Back</button>}
              <GlassButton type="submit" variant="solid" block disabled={busy}>{busy ? "Checking..." : deliveryStep === 3 ? "Complete details" : "Continue"}</GlassButton>
            </div>}
          </form>
          <p className="staff-switch">Already applied? <Link to="/login?role=delivery">Go to delivery login</Link></p>
        </div>
      </div>
    );
  }

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

        {canSignup && (
          <div className="tabs">
            <button type="button" className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => switchMode("signup")}>
              {door ? (doorRole === "seller" ? "Register as seller" : "Apply to deliver") : "Sign up"}
            </button>
          </div>
        )}

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
                <input type="radio" name="role" checked={pickedRole === "delivery"} onChange={() => navigate("/login?role=delivery&mode=signup")} />
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
            <input type="email" required value={email} onChange={(e) => changeEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          {mode === "signup" && role === "customer" && (
            <EmailVerification email={email} purpose="CUSTOMER_REGISTRATION" token={emailToken} onVerified={(t) => { setEmailToken(t); setError(""); }} />
          )}
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

          {notice && <p className="success" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}

          <GlassButton type="submit" variant="solid" block disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : doorRole === "seller" ? "Send application" : doorRole === "delivery" ? "Send application" : "Create account"}
          </GlassButton>
        </form>

        {door && (
          <p className="staff-switch">
            Not {doorRole === "admin" ? "staff" : "a " + doorRole}? <Link to="/login">Customer login</Link>
          </p>
        )}
      </div>
    </div>
  );
}