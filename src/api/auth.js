import * as mock from "./authMock.js";
export * from "./authMock.js";

// Only authentication talks to the real backend; dashboards keep their demo data
const REAL = import.meta.env.VITE_REAL_AUTH === "true";

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

const needReal = () => Promise.reject(new Error("This needs the real backend. Set VITE_REAL_AUTH=true in .env and restart npm run dev."));

// Saves who is logged in, after the backend has started the session
function finishLogin(u, role) {
  const user = { ...u, role: String(u.role).toLowerCase() };

  // /login?role=admin or ?role=delivery or ?role=seller must be an account of that type
  if (role && user.role !== String(role).toLowerCase()) {
    throw new Error(`This account does not have ${role} access.`);
  }

  localStorage.setItem("vyapari_role", user.role);
  localStorage.setItem("vyapari_user", JSON.stringify(user));
  return user;
}

// Step 1. Customers and sellers get { otpRequired: true, ... } and a code by email.
// Admin and delivery partners get the user straight away.
async function realLogin({ email, password, role }) {
  const u = await call("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, ...(role ? { role } : {}) }),
  });
  if (u.otpRequired) {
    return { otpRequired: true, email: u.email, maskedEmail: u.maskedEmail, message: u.message };
  }
  return finishLogin(u, role);
}

async function realRegister({ name, email, phone, password, role, shopName, city }) {
  // role is "customer", "seller" or "delivery" - the backend accepts it as is
  return call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password, role, shopName, city }),
  });
}

export const login = (creds) => (REAL ? realLogin(creds) : mock.login(creds));
export const register = (data) => (REAL ? realRegister(data) : mock.register(data));
export const homeFor = (role) => (REAL ? homes[role] || "/" : mock.homeFor(role));

// Step 2 of login: the 6-digit code from the email
export const verifyLoginOtp = ({ email, code, role }) =>
  REAL
    ? call("/api/auth/login/verify", { method: "POST", body: JSON.stringify({ email, code, ...(role ? { role } : {}) }) }).then((u) => finishLogin(u, role))
    : needReal();

// Forgot password: 1) ask for a code, 2) send the code with a new password
export const forgotPassword = (email) =>
  REAL ? call("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }) : needReal();

export const resetPassword = ({ email, code, newPassword }) =>
  REAL ? call("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, newPassword }) }) : needReal();

export async function logout() {
  if (!REAL) return mock.logout?.();
  await call("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem("vyapari_role");
  localStorage.removeItem("vyapari_user");
}