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

async function realRegister({ name, email, phone, password, role, shopName, city }) {
  // role is "customer" or "seller" - the backend accepts it as is
  return call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password, role, shopName, city }),
  });
}

export const login = (creds) => (REAL ? realLogin(creds) : mock.login(creds));
export const register = (data) => (REAL ? realRegister(data) : mock.register(data));
export const homeFor = (role) => (REAL ? homes[role] || "/" : mock.homeFor(role));

export async function logout() {
  if (!REAL) return mock.logout?.();
  await call("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem("vyapari_role");
  localStorage.removeItem("vyapari_user");
}