import * as mock from "./authMock.js";
export * from "./authMock.js";

// Only authentication talks to the real backend; dashboards keep their demo data
const REAL = import.meta.env.VITE_REAL_AUTH === "true";
const REAL_DELIVERY = import.meta.env.VITE_REAL_DELIVERY_AUTH === "true";
const REAL_ADMIN = import.meta.env.VITE_REAL_ADMIN_AUTH === "true";

// The backend already sends roles in lower case: admin, seller, customer, delivery
const homes = { admin: "/admin", seller: "/seller/dashboard", delivery: "/delivery/dashboard", customer: "/customer" };

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      credentials: "include", // session cookie
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Could not reach the server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

async function realLogin({ email, password, role }) {
  // role is only sent for /login?role=admin or ?role=delivery (the staff doors)
  const u = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(role ? { role } : {}) }),
  });
  const user = { ...u, role: String(u.role).toLowerCase() };

  if (role && user.role !== String(role).toLowerCase()) {
    throw new Error(`This account does not have ${role} access.`);
  }

  localStorage.setItem("vyapari_role", user.role);
  localStorage.setItem("vyapari_user", JSON.stringify(user));
  return user;
}

async function realRegister({ name, email, phone, password, role, shopName, city, emailVerificationToken }) {
  // role is "customer" or "seller" - the backend accepts it as is
  return call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password, role, shopName, city, emailVerificationToken }),
  });
}


function dataUrlToFile(doc) {
  if (!doc?.data) return null;
  const [meta, encoded] = doc.data.split(",");
  const mime = /data:([^;]+)/.exec(meta)?.[1] || doc.type || "application/octet-stream";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], doc.name || "document", { type: mime });
}

// E-mail verification codes (delivery partners and customers). Always the real Spring Boot server:
// POST /api/auth/otp/send { email, purpose } and /api/auth/otp/verify { email, purpose, code } -> { verificationToken }
export const sendEmailCode = ({ email, purpose }) =>
  call("/api/auth/otp/send", { method: "POST", body: JSON.stringify({ email, purpose }) });
export const verifyEmailCode = ({ email, purpose, code }) =>
  call("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, purpose, code }) });

// Step 1 of the wizard: is this email / mobile already registered? Resolves, or throws the server's message.
export async function checkDeliveryContact({ email, phone }) {
  if (!REAL && !REAL_DELIVERY) return { available: true };
  return call("/api/auth/register/delivery/check", { method: "POST", body: JSON.stringify({ email, phone }) });
}

export async function registerDeliveryApplication(payload) {
  if (!REAL && !REAL_DELIVERY) return mock.register({ ...payload, role: "delivery" });
  const { documents, emailVerificationToken, ...fields } = payload;
  const application = {
    name: fields.name, email: fields.email, phone: fields.phone, password: fields.password, role: "delivery",
    dateOfBirth: fields.dateOfBirth, address: fields.address, city: fields.city, pincode: fields.pincode,
    emergencyContact: fields.emergencyContact, identityDocumentType: fields.identityDocumentType,
    identityDocumentName: fields.identityDocumentName, identityDocumentNumber: fields.identityDocumentNumber,
    vehicleType: fields.vehicleType, vehicleOtherName: fields.vehicleOtherName, vehicleNumber: fields.vehicleNumber,
    drivingLicenseNumber: fields.drivingLicenseNumber, serviceablePincodes: fields.serviceablePincodes,
    availabilityPreference: fields.availabilityPreference, deliveryExperience: fields.deliveryExperience,
    workingDays: fields.workingDays, workingHours: fields.workingHours,
  };
  const form = new FormData();
  form.append("application", new Blob([JSON.stringify(application)], { type: "application/json" }));
  const identity = dataUrlToFile(documents?.identity);
  if (!identity) throw new Error("Please upload or capture your government identity document.");
  form.append("identity", identity);
  const licence = dataUrlToFile(documents?.licence);
  const vehicleRc = dataUrlToFile(documents?.vehicleRc);
  if (licence) form.append("licence", licence);
  if (vehicleRc) form.append("vehicleRc", vehicleRc);
  if (emailVerificationToken) form.append("emailVerificationToken", emailVerificationToken);
  let response;
  try {
    response = await fetch("/api/auth/register/delivery", { method: "POST", credentials: "include", body: form });
  } catch { throw new Error("Could not reach the server. Check that Spring Boot is running."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 413) throw new Error("Each document must be 5 MB or smaller.");
    throw new Error(data.message || data.error || `Registration failed (${response.status})`);
  }
  return data;
}

export const login = (creds) => ((REAL || (REAL_DELIVERY && creds.role === "delivery") || (REAL_ADMIN && creds.role === "admin")) ? realLogin(creds) : mock.login(creds));
export const register = (data) => (REAL ? realRegister(data) : mock.register(data));
export const homeFor = (role) => (REAL ? homes[role] || "/" : mock.homeFor(role));

export async function logout() {
  if (!REAL && !REAL_DELIVERY && !REAL_ADMIN) return mock.logout?.();
  await call("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem("vyapari_role");
  localStorage.removeItem("vyapari_user");
}