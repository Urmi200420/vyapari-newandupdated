/*
  Login / registration. Same idea as the other api files:
  demo accounts in the browser now (VITE_USE_MOCK is not "false"), the real Spring Boot server later.

  ---------- endpoints (Spring Boot AuthController) ----------
  POST /api/auth/register   { name, email, phone, password, role: "customer" | "seller", shopName?, city? }  -> 201 User
  POST /api/auth/login      { email, password, role? }   -> 200 User   (the browser stores the session cookie)
  GET  /api/auth/me                                      -> 200 User, or 401 when not logged in
  POST /api/auth/logout                                  -> 200
  Errors are always JSON: { "message": "..." }

  User { id, name, email, phone, role: "customer"|"seller"|"delivery"|"admin",
         status: "ACTIVE"|"PENDING"|"REJECTED"|"BLOCKED", shopName }
*/
const USE_MOCK = import.meta.env.VITE_USE_MOCK=false;

// where each kind of person lands after logging in (change a path here if your route is different)
export const ROLE_HOME = {
  customer: "/customer",
  seller: "/seller/dashboard",
  admin: "/admin/dashboard",
  delivery: "/delivery/dashboard",
};
export const homeFor = (role) => ROLE_HOME[role] || "/";

const ROLE_KEY = "vyapari_role"; // the dashboards' guards read this
const USER_KEY = "vyapari_user";

function remember(user) {
  try {
    localStorage.setItem(ROLE_KEY, user.role);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage blocked: the session cookie still works */
  }
}
function forget() {
  try {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}
export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

/* ======================= REAL BACKEND ======================= */
async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    const err = new Error((data && data.message) || "Something went wrong (" + res.status + ")");
    err.status = res.status;
    err.fields = (data && data.errors) || {};
    throw err;
  }
  return data;
}
const http = {
  register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
};

/* ======================= DEMO ACCOUNTS (browser only) ======================= */
const MOCK_KEY = "vyapari_mock_users_v1";
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const fail = (status, message) => Object.assign(new Error(message), { status, fields: {} });

function mockUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(MOCK_KEY));
    if (Array.isArray(list)) return list;
  } catch {
    /* fall through */
  }
  // same first admin the real backend creates
  const seed = [{ id: 1, name: "Vyapari Admin", email: "admin@vyapari.com", phone: "9000000000", password: "Admin@12345", role: "admin", status: "ACTIVE" }];
  saveMock(seed);
  return seed;
}
function saveMock(list) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
const publicUser = ({ password, ...rest }) => rest;
let mockSession = null;

const mock = {
  async register(b) {
    await wait();
    const email = String(b.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, "Please enter a valid email address.");
    if (!/^[6-9]\d{9}$/.test(b.phone || "")) throw fail(400, "Enter a valid 10-digit mobile number.");
    if ((b.password || "").length < 8) throw fail(400, "Password must be 8 to 72 characters.");
    const role = String(b.role || "").toLowerCase();
    if (!["customer", "seller"].includes(role)) throw fail(400, "Only customers and sellers can sign up here.");
    if (role === "seller" && String(b.shopName || "").trim().length < 2) throw fail(400, "Please enter your shop name.");
    const list = mockUsers();
    if (list.some((u) => u.email === email)) throw fail(409, "This email is already registered. Try logging in.");
    const user = {
      id: Date.now(),
      name: String(b.name || "").trim(),
      email,
      phone: b.phone,
      password: b.password,
      role,
      status: role === "seller" ? "PENDING" : "ACTIVE",
      shopName: role === "seller" ? b.shopName.trim() : null,
    };
    saveMock([...list, user]);
    return publicUser(user);
  },
  async login(b) {
    await wait();
    const user = mockUsers().find((u) => u.email === String(b.email || "").trim().toLowerCase());
    if (!user || user.password !== b.password) throw fail(401, "Invalid email or password.");
    if (b.role && b.role !== user.role) throw fail(403, "This login is only for " + b.role + " accounts.");
    if (user.status === "PENDING") throw fail(403, "Your seller account is waiting for admin approval. We will let you in as soon as it is approved.");
    if (user.status === "REJECTED") throw fail(403, "Your seller application was not approved.");
    if (user.status === "BLOCKED") throw fail(403, "Your account has been blocked. Please contact support.");
    mockSession = user.id;
    return publicUser(user);
  },
  async me() {
    await wait(100);
    const user = mockUsers().find((u) => u.id === mockSession) || currentUser();
    if (!user) throw fail(401, "Please log in.");
    return publicUser(user);
  },
  async logout() {
    mockSession = null;
  },
};

const impl = USE_MOCK ? mock : http;

export const register = (body) => impl.register(body);
export async function login(body) {
  const user = await impl.login(body);
  remember(user);
  return user;
}
export const getMe = () => impl.me();
export async function logout() {
  try {
    await impl.logout();
  } finally {
    forget();
  }
}