/*
  Support tickets: delivery person → admin.
  Same idea as api/index.js — fake data in the browser now, real Spring Boot later.

  USE_MOCK = true  → tickets live in localStorage (key "vyapari_tickets_v1"),
                     so an admin screen on the same browser can read them too.
  USE_MOCK = false → real HTTP calls (see endpoints below). Change URLs HERE only.

  ─── JSON shape ────────────────────────────────────────────────────────────────
  Ticket {
    id, ref ("TKT-1001"),
    category, priority ("NORMAL" | "URGENT"),
    orderId (or ""),
    subject, message,
    status ("OPEN" | "IN_PROGRESS" | "RESOLVED"),
    adminReply (or ""),
    raisedBy, createdAt (ISO), updatedAt (ISO)
  }

  Delivery person:
    POST  /api/delivery/tickets       body { category, priority, orderId, subject, message } → Ticket
    GET   /api/delivery/tickets       → [Ticket]  (only this person's, newest first)
  Admin:
    GET   /api/admin/tickets          → [Ticket]  (everyone's)
    PATCH /api/admin/tickets/{id}     body { status, adminReply } → Ticket
  ───────────────────────────────────────────────────────────────────────────────
*/

// Same VITE_USE_MOCK flag used by the rest of the app (api/index.js).
// Set VITE_USE_MOCK=true in .env.development to use localStorage mock.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const KEY  = "vyapari_tickets_v1";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const CATEGORIES = [
  "Customer not reachable",
  "Wrong or incomplete address",
  "Payment / COD mismatch",
  "Vehicle breakdown or fuel",
  "Accident or safety issue",
  "Seller pickup problem",
  "Payout or earnings",
  "App problem",
  "Other",
];

export const STATUS_LABEL = {
  OPEN:        "Open",
  IN_PROGRESS: "In progress",
  RESOLVED:    "Resolved",
};

/* ── Mock (browser only) ───────────────────────────────────────────────────── */

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new Error("Browser storage is full or blocked — ticket could not be saved.");
  }
}

const mock = {
  async raiseTicket(payload, riderName) {
    await wait(450);
    const list = load();
    const now  = new Date().toISOString();
    const ticket = {
      id:         Date.now(),
      ref:        `TKT-${1001 + list.length}`,
      ...payload,
      status:     "OPEN",
      adminReply: "",
      raisedBy:   riderName || "Delivery partner",
      createdAt:  now,
      updatedAt:  now,
    };
    save([ticket, ...list]);
    return ticket;
  },

  async getMyTickets() {
    await wait(150);
    return load();
  },

  async getAllTickets() {
    await wait(150);
    return load();
  },

  async updateTicket(id, changes) {
    await wait(300);
    const list = load().map((t) =>
      t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t,
    );
    save(list);
    return list.find((t) => t.id === id) ?? null;
  },
};

/* ── Real backend ──────────────────────────────────────────────────────────── */

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

const http = {
  raiseTicket:  (payload) => request("/api/delivery/tickets",    { method: "POST",  body: JSON.stringify(payload) }),
  getMyTickets: ()        => request("/api/delivery/tickets"),
  getAllTickets: ()        => request("/api/admin/tickets"),
  updateTicket: (id, ch)  => request(`/api/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(ch) }),
};

/* ── Exports ───────────────────────────────────────────────────────────────── */

const impl = USE_MOCK ? mock : http;

// .bind(impl) keeps `this` correct if mock methods ever reference it
export const raiseTicket  = impl.raiseTicket .bind(impl); // ({category,priority,orderId,subject,message}, riderName?) → Ticket
export const getMyTickets = impl.getMyTickets.bind(impl); // → [Ticket]
export const getAllTickets = impl.getAllTickets.bind(impl); // (admin) → [Ticket]
export const updateTicket = impl.updateTicket.bind(impl); // (admin) (id, {status,adminReply}) → Ticket
