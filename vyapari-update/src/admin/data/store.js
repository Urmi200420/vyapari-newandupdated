/*
  Admin data store (frontend only).

  • The whole admin dataset lives in localStorage under STORAGE_KEY, so demo changes survive a refresh.
  • Every action below is a pure function: (db, ...args) => { db, message }.
    AdminContext.jsx runs them and shows `message` as a toast.
  • Tickets raised in the other dashboards on this browser are copied in (read-only) by importExternalTickets().
    The admin's edits stay in the admin store; the other dashboards' data is never written to.

  Reset the demo from the sidebar ("Reset demo data") or with:
      localStorage.removeItem("vyapari_admin_v1")
*/
import { buildSeed, CURRENT_ADMIN_ID, DAY, areaOf } from "./seed.js";

export const STORAGE_KEY = "vyapari_admin_v1";
const VERSION = 1;

/* ---------------- persistence ---------------- */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Move every seeded date forward by `delta` ms, so a demo saved days ago still looks current.
function shiftDates(value, delta, now) {
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, delta, now));
  if (value && typeof value === "object") {
    if (value.source === "live") return value; // real tickets from the other dashboards keep their real dates
    const out = {};
    for (const k in value) out[k] = shiftDates(value[k], delta, now);
    return out;
  }
  if (typeof value === "string" && ISO.test(value)) return new Date(Math.min(now, Date.parse(value) + delta)).toISOString();
  return value;
}

export function loadDb(now = Date.now()) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.version === VERSION && Array.isArray(saved.orders) && saved.seededAt) {
      const days = Math.floor((now - saved.seededAt) / DAY);
      if (days >= 1) {
        const { log, ...rest } = saved;
        const moved = shiftDates(rest, days * DAY, now);
        return { ...moved, log: log || [], seededAt: saved.seededAt + days * DAY };
      }
      return saved;
    }
  } catch {
    /* corrupted or blocked storage: start fresh */
  }
  return buildSeed(now);
}

export function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false; // storage full or blocked: the demo keeps working until refresh
  }
}

/* ---------------- helpers ---------------- */
const nowIso = () => new Date().toISOString();
export const me = (db) => db.admins.find((a) => a.id === CURRENT_ADMIN_ID) || db.admins[0];
const patch = (list, id, fn) => list.map((x) => (x.id === id ? { ...x, ...fn(x) } : x));
const logged = (db, type, text) => ({
  ...db,
  log: [{ id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), at: nowIso(), type, text, by: me(db).name }, ...db.log].slice(0, 200),
});
const ok = (db, message) => ({ db, message });
const fail = (db, message) => ({ db, message, error: true });
const nextId = (list, prefix, pad = 0) => {
  const max = list.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0);
  return prefix + String(max + 1).padStart(pad, "0");
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";

/* ---------------- sellers ---------------- */
export function approveSeller(db, id) {
  const s = db.sellers.find((x) => x.id === id);
  if (!s || s.status !== "PENDING") return fail(db, "Only pending sellers can be approved.");
  const at = nowIso();
  db = { ...db, sellers: patch(db.sellers, id, (x) => ({ status: "ACTIVE", approvedAt: at, statusNote: "", lastActiveAt: at, history: [...x.history, { at, text: "Approved by " + me(db).name }] })) };
  return ok(logged(db, "seller", `Approved seller ${s.business}`), `${s.business} is now ACTIVE.`);
}
export function rejectSeller(db, id, reason) {
  const s = db.sellers.find((x) => x.id === id);
  if (!s || s.status !== "PENDING") return fail(db, "Only pending sellers can be rejected.");
  const at = nowIso();
  const note = reason?.trim() || "Did not meet the onboarding requirements";
  db = { ...db, sellers: patch(db.sellers, id, (x) => ({ status: "REJECTED", statusNote: note, history: [...x.history, { at, text: "Rejected by " + me(db).name + ": " + note }] })) };
  return ok(logged(db, "seller", `Rejected seller ${s.business}`), `${s.business} was REJECTED.`);
}
export function blockSeller(db, id, reason) {
  const s = db.sellers.find((x) => x.id === id);
  if (!s || s.status !== "ACTIVE") return fail(db, "Only active sellers can be blocked.");
  const note = reason?.trim() || "Blocked by admin";
  db = { ...db, sellers: patch(db.sellers, id, (x) => ({ status: "BLOCKED", statusNote: note, history: [...x.history, { at: nowIso(), text: "Blocked by " + me(db).name + ": " + note }] })) };
  return ok(logged(db, "seller", `Blocked seller ${s.business}`), `${s.business} has been blocked. Their listings are hidden.`);
}
export function reactivateSeller(db, id) {
  const s = db.sellers.find((x) => x.id === id);
  if (!s || s.status !== "BLOCKED") return fail(db, "Only blocked sellers can be reactivated.");
  db = { ...db, sellers: patch(db.sellers, id, (x) => ({ status: "ACTIVE", statusNote: "", history: [...x.history, { at: nowIso(), text: "Reactivated by " + me(db).name }] })) };
  return ok(logged(db, "seller", `Reactivated seller ${s.business}`), `${s.business} is ACTIVE again.`);
}

/* ---------------- customers ---------------- */
export function setCustomerStatus(db, id, status) {
  const c = db.customers.find((x) => x.id === id);
  if (!c) return fail(db, "Customer not found.");
  db = { ...db, customers: patch(db.customers, id, () => ({ status })) };
  return ok(logged(db, "customer", `${status === "ACTIVE" ? "Reactivated" : "Suspended"} customer ${c.name}`), `${c.name} is now ${status === "ACTIVE" ? "active" : "suspended"}.`);
}

/* ---------------- delivery personnel ---------------- */
export function addCourier(db, f) {
  const email = f.email.trim().toLowerCase();
  if (db.delivery.some((d) => d.email.toLowerCase() === email)) return fail(db, "A delivery partner with this email already exists.");
  const pins = [...new Set(f.pincodes)];
  if (!pins.length) return fail(db, "Add at least one serviceable pincode.");
  const id = nextId(db.delivery, "DLV-");
  const at = nowIso();
  const person = {
    id,
    name: f.name.trim(),
    email,
    phone: f.phone.trim(),
    vehicle: f.vehicle.trim(),
    pincodes: pins,
    city: areaOf(pins[0]).city,
    availability: "AVAILABLE",
    status: "ACTIVE",
    statusNote: "",
    registeredAt: at,
    rating: null,
    lifetimeDeliveries: 0,
    lastActiveAt: at,
  };
  db = { ...db, delivery: [person, ...db.delivery] };
  return ok(logged(db, "delivery", `Registered delivery partner ${person.name}`), `${person.name} registered as ${id}.`);
}
export function setCourierStatus(db, id, status) {
  const d = db.delivery.find((x) => x.id === id);
  if (!d) return fail(db, "Delivery partner not found.");
  if (status === "INACTIVE" && db.orders.some((o) => o.deliveryPersonId === id && o.status === "IN_TRANSIT"))
    return fail(db, `${d.name} has parcels in transit. Finish or reassign them first.`);
  db = { ...db, delivery: patch(db.delivery, id, (x) => ({ status, availability: status === "INACTIVE" ? "OFF_DUTY" : x.availability === "OFF_DUTY" ? "AVAILABLE" : x.availability, statusNote: status === "INACTIVE" ? "Deactivated by admin" : "" })) };
  return ok(logged(db, "delivery", `${status === "ACTIVE" ? "Activated" : "Deactivated"} delivery partner ${d.name}`), `${d.name} is now ${status.toLowerCase()}.`);
}
export function setCourierAvailability(db, id, availability) {
  const d = db.delivery.find((x) => x.id === id);
  if (!d || d.status !== "ACTIVE") return fail(db, "Activate this delivery partner first.");
  db = { ...db, delivery: patch(db.delivery, id, () => ({ availability })) };
  return ok(db, `${d.name} marked ${availability.replace("_", " ").toLowerCase()}.`);
}
export function assignOrder(db, orderId, personId) {
  const o = db.orders.find((x) => x.id === orderId);
  const d = db.delivery.find((x) => x.id === personId);
  if (!o || !d) return fail(db, "Order or delivery partner not found.");
  if (!["CONFIRMED", "PROCESSING"].includes(o.status)) return fail(db, "Only confirmed or processing orders can be assigned.");
  if (d.status !== "ACTIVE" || d.availability === "OFF_DUTY") return fail(db, `${d.name} is not on duty.`);
  const at = nowIso();
  const was = o.deliveryPersonId && db.delivery.find((x) => x.id === o.deliveryPersonId);
  db = {
    ...db,
    orders: patch(db.orders, orderId, (x) => ({ deliveryPersonId: personId, timeline: [...x.timeline, { status: "ASSIGNED", at, note: (was ? "Reassigned from " + was.name + " to " : "Assigned to ") + d.name }] })),
  };
  return ok(logged(db, "order", `Assigned ${o.id} to ${d.name}`), `${o.id} assigned to ${d.name}.`);
}
export function unassignOrder(db, orderId) {
  const o = db.orders.find((x) => x.id === orderId);
  if (!o || !o.deliveryPersonId) return fail(db, "This order has no delivery partner.");
  if (o.status === "IN_TRANSIT" || o.status === "DELIVERED") return fail(db, "Parcels already picked up cannot be unassigned.");
  const d = db.delivery.find((x) => x.id === o.deliveryPersonId);
  db = { ...db, orders: patch(db.orders, orderId, (x) => ({ deliveryPersonId: null, timeline: [...x.timeline, { status: "UNASSIGNED", at: nowIso(), note: "Removed " + (d?.name || "delivery partner") }] })) };
  return ok(logged(db, "order", `Unassigned ${o.id}`), `${o.id} is back in the assignment queue.`);
}

/* ---------------- orders ---------------- */
export const ORDER_FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "IN_TRANSIT", "DELIVERED"];
export function setOrderStatus(db, orderId, status, note = "") {
  const o = db.orders.find((x) => x.id === orderId);
  if (!o) return fail(db, "Order not found.");
  if (o.status === "DELIVERED" || o.status === "CANCELLED") return fail(db, "This order is already closed.");
  if (status === "IN_TRANSIT" && !o.deliveryPersonId) return fail(db, "Assign a delivery partner before marking it in transit.");
  const at = nowIso();
  db = {
    ...db,
    orders: patch(db.orders, orderId, (x) => ({
      status,
      deliveredAt: status === "DELIVERED" ? at : x.deliveredAt,
      payment: status === "DELIVERED" && x.payment === "COD_DUE" ? "PAID" : status === "CANCELLED" ? (x.method === "COD" ? "NOT_CHARGED" : "REFUNDED") : x.payment,
      timeline: [...x.timeline, { status, at, note: note || "Updated by " + me(db).name }],
    })),
  };
  return ok(logged(db, "order", `Marked ${o.id} as ${status.replace("_", " ").toLowerCase()}`), `${o.id} → ${status.replace("_", " ")}.`);
}

/* ---------------- tickets ---------------- */
export function updateTicket(db, id, changes, note) {
  const t = db.tickets.find((x) => x.id === id);
  if (!t) return fail(db, "Ticket not found.");
  const at = nowIso();
  const notes = [...t.notes];
  if (changes.status && changes.status !== t.status) notes.push({ at, by: me(db).name, text: "Status changed to " + changes.status.replace("_", " ").toLowerCase() });
  if (changes.priority && changes.priority !== t.priority) notes.push({ at, by: me(db).name, text: "Priority changed to " + changes.priority.toLowerCase() });
  if (note?.trim()) notes.push({ at, by: me(db).name, text: note.trim() });
  const resolved = changes.status === "RESOLVED" || changes.status === "CLOSED";
  db = { ...db, tickets: patch(db.tickets, id, (x) => ({ ...changes, notes, updatedAt: at, resolvedAt: resolved ? x.resolvedAt || at : changes.status ? null : x.resolvedAt })) };
  const what = changes.status ? changes.status.replace("_", " ").toLowerCase() : changes.priority ? "priority " + changes.priority.toLowerCase() : "note added";
  return ok(changes.status ? logged(db, "ticket", `Ticket ${id} ${what}`) : db, `${id}: ${what}.`);
}

// copy tickets raised in the seller / delivery / customer dashboards on this browser
export function readExternalTickets(storage = globalThis.localStorage) {
  const read = (k) => {
    try {
      return JSON.parse(storage.getItem(k));
    } catch {
      return null;
    }
  };
  const out = [];
  const findOrder = (text) => (String(text).match(/\b(?:VYP|ORD)-[A-Z0-9-]+/i) || [""])[0];

  const sellerDb = read("vyapari_mock_v3");
  for (const t of sellerDb?.tickets || []) {
    const p = sellerDb.profile || {};
    out.push({
      extId: "seller:" + t.id,
      userType: "seller",
      raisedBy: (p.ownerName || "Seller") + (p.shopName ? " · " + p.shopName : ""),
      business: p.shopName || "",
      subject: t.subject || "Message to admin",
      description: t.message || "",
      topic: "Contact admin",
      orderId: findOrder(t.subject + " " + t.message),
      priority: "MEDIUM",
      status: "OPEN",
      createdAt: t.createdAt || nowIso(),
    });
  }
  const riderList = read("vyapari_tickets_v1");
  for (const t of Array.isArray(riderList) ? riderList : []) {
    out.push({
      extId: "delivery:" + t.id,
      userType: "delivery",
      raisedBy: t.raisedBy || "Delivery partner",
      subject: t.subject || t.category || "Delivery issue",
      description: t.message || "",
      topic: t.category || "Other",
      orderId: t.orderId || "",
      priority: t.priority === "URGENT" ? "URGENT" : "MEDIUM",
      status: ["OPEN", "IN_PROGRESS", "RESOLVED"].includes(t.status) ? t.status : "OPEN",
      createdAt: t.createdAt || nowIso(),
    });
  }
  const customerState = read("vyapari_customer_v1");
  const CMAP = { Submitted: "OPEN", "Under Review": "IN_PROGRESS", Resolved: "RESOLVED", Rejected: "CLOSED" };
  for (const c of customerState?.complaints || []) {
    out.push({
      extId: "customer:" + c.id,
      userType: "customer",
      raisedBy: customerState.profile?.name || "Customer",
      subject: c.category + (c.product?.name ? " — " + c.product.name : ""),
      description: c.description || "",
      topic: c.category || "Complaint",
      orderId: c.orderId || "",
      priority: /Damaged|Defective|Wrong/.test(c.category) ? "HIGH" : "MEDIUM",
      status: CMAP[c.status] || "OPEN",
      createdAt: c.date || nowIso(),
    });
  }
  return out;
}

export function importExternalTickets(db, external) {
  const fresh = external.filter((e) => !db.importedTickets[e.extId]);
  if (!fresh.length) return null;
  let tickets = db.tickets;
  const importedTickets = { ...db.importedTickets };
  for (const e of fresh) {
    const id = nextId(tickets, "TCK-");
    const { extId, business, ...rest } = e;
    const raiser =
      e.userType === "seller"
        ? db.sellers.find((s) => business && s.business.toLowerCase().startsWith(business.toLowerCase().split(" ").slice(0, 2).join(" ")))
        : e.userType === "delivery"
          ? db.delivery.find((d) => d.name === e.raisedBy)
          : db.customers.find((c) => c.name === e.raisedBy);
    tickets = [{ ...rest, id, raisedById: raiser?.id || "", updatedAt: e.createdAt, resolvedAt: null, notes: [], source: "live", externalRef: extId }, ...tickets];
    importedTickets[extId] = id;
  }
  tickets = [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...db, tickets, importedTickets };
}

/* ---------------- catalogue ---------------- */
export function saveCategory(db, id, f) {
  const name = f.name.trim();
  if (!name) return fail(db, "Give the category a name.");
  if (db.categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return fail(db, `A category called "${name}" already exists.`);
  if (id) {
    db = { ...db, categories: patch(db.categories, id, () => ({ name, icon: f.icon || "🏷️", description: f.description?.trim() || "" })) };
    return ok(logged(db, "catalog", `Edited category ${name}`), `Category "${name}" updated.`);
  }
  let newId = slug(name);
  while (db.categories.some((c) => c.id === newId)) newId += "-2";
  const cat = { id: newId, name, icon: f.icon || "🏷️", description: f.description?.trim() || "", createdAt: nowIso(), order: db.categories.length, subcategories: [] };
  db = { ...db, categories: [...db.categories, cat] };
  return ok(logged(db, "catalog", `Added category ${name}`), `Category "${name}" added.`);
}
export function deleteCategory(db, id) {
  const c = db.categories.find((x) => x.id === id);
  if (!c) return fail(db, "Category not found.");
  db = { ...db, categories: db.categories.filter((x) => x.id !== id) };
  return ok(logged(db, "catalog", `Deleted category ${c.name}`), `Category "${c.name}" deleted.`);
}
export function saveSubcategory(db, catId, subId, name) {
  const c = db.categories.find((x) => x.id === catId);
  name = name.trim();
  if (!c) return fail(db, "Category not found.");
  if (!name) return fail(db, "Give the subcategory a name.");
  if (c.subcategories.some((s) => s.id !== subId && s.name.toLowerCase() === name.toLowerCase())) return fail(db, `"${name}" already exists in ${c.name}.`);
  const subcategories = subId
    ? c.subcategories.map((s) => (s.id === subId ? { ...s, name } : s))
    : [...c.subcategories, { id: catId + "-" + (c.subcategories.reduce((m, s) => Math.max(m, Number(s.id.split("-").pop()) || 0), 0) + 1), name, products: 0 }];
  db = { ...db, categories: patch(db.categories, catId, () => ({ subcategories })) };
  return ok(logged(db, "catalog", `${subId ? "Renamed" : "Added"} subcategory ${name} in ${c.name}`), `${subId ? "Renamed to" : "Added"} "${name}" in ${c.name}.`);
}
export function deleteSubcategory(db, catId, subId) {
  const c = db.categories.find((x) => x.id === catId);
  const s = c?.subcategories.find((x) => x.id === subId);
  if (!s) return fail(db, "Subcategory not found.");
  db = { ...db, categories: patch(db.categories, catId, () => ({ subcategories: c.subcategories.filter((x) => x.id !== subId) })) };
  return ok(logged(db, "catalog", `Deleted subcategory ${s.name} from ${c.name}`), `"${s.name}" removed from ${c.name}.`);
}

/* ---------------- returns & refunds ---------------- */
export function reviewRefund(db, id) {
  const r = db.refunds.find((x) => x.id === id);
  if (!r || r.status !== "PENDING") return fail(db, "Only new requests can be moved to review.");
  db = { ...db, refunds: patch(db.refunds, id, () => ({ status: "UNDER_REVIEW", decidedBy: null })) };
  return ok(logged(db, "refund", `Started review of ${id}`), `${id} is under review.`);
}
export function decideRefund(db, id, approve, note) {
  const r = db.refunds.find((x) => x.id === id);
  if (!r || !["PENDING", "UNDER_REVIEW"].includes(r.status)) return fail(db, "This request has already been decided.");
  const at = nowIso();
  db = { ...db, refunds: patch(db.refunds, id, () => ({ status: approve ? "APPROVED" : "REJECTED", decidedAt: at, decidedBy: me(db).name, adminNote: note?.trim() || (approve ? "" : "Does not meet the return policy.") })) };
  if (approve) {
    const o = db.orders.find((x) => x.id === r.orderId);
    if (o) {
      const total = db.refunds.filter((x) => x.orderId === o.id && ["APPROVED", "COMPLETED"].includes(x.status)).reduce((s, x) => s + x.amount, 0);
      db = { ...db, orders: patch(db.orders, o.id, (x) => ({ payment: total >= x.amount ? "REFUNDED" : "PARTIAL_REFUND", timeline: [...x.timeline, { status: "REFUND", at, note: `${r.type === "RETURN" ? "Return" : "Refund"} ${id} approved` }] })) };
    }
  }
  return ok(logged(db, "refund", `${approve ? "Approved" : "Rejected"} ${r.type.toLowerCase()} ${id} (${r.orderId})`), `${id} ${approve ? "approved — refund issued to the customer" : "rejected"}.`);
}
export function completeReturn(db, id) {
  const r = db.refunds.find((x) => x.id === id);
  if (!r || r.status !== "APPROVED" || r.type !== "RETURN") return fail(db, "Only approved returns can be marked as picked up.");
  db = { ...db, refunds: patch(db.refunds, id, () => ({ status: "COMPLETED" })) };
  return ok(logged(db, "refund", `Return ${id} picked up and closed`), `${id} closed — item received back.`);
}

/* ---------------- admins ---------------- */
export function addAdmin(db, f) {
  const email = f.email.trim().toLowerCase();
  if (db.admins.some((a) => a.email.toLowerCase() === email && a.status === "ACTIVE")) return fail(db, "An active admin with this email already exists.");
  const at = nowIso();
  const admin = { id: nextId(db.admins, "ADM-", 3), name: f.name.trim(), email, phone: f.phone.trim(), role: f.role, addedAt: at, addedBy: me(db).name, status: "ACTIVE", deletedAt: null, deletedReason: "", lastLoginAt: null };
  db = { ...db, admins: [...db.admins, admin] };
  return ok(logged(db, "admin", `Added admin ${admin.name} (${admin.role})`), `${admin.name} added as ${admin.role}.`);
}
export function softDeleteAdmin(db, id, reason) {
  const a = db.admins.find((x) => x.id === id);
  if (!a || a.status !== "ACTIVE") return fail(db, "Admin not found or already removed.");
  if (id === CURRENT_ADMIN_ID) return fail(db, "You cannot remove your own account.");
  if (a.role === "Super Admin" && db.admins.filter((x) => x.role === "Super Admin" && x.status === "ACTIVE").length < 2) return fail(db, "Keep at least one active Super Admin.");
  db = { ...db, admins: patch(db.admins, id, () => ({ status: "DELETED", deletedAt: nowIso(), deletedReason: reason?.trim() || "Left the organisation" })) };
  return ok(logged(db, "admin", `Removed admin ${a.name} (soft delete)`), `${a.name}'s access was removed. The record is kept.`);
}
export function restoreAdmin(db, id) {
  const a = db.admins.find((x) => x.id === id);
  if (!a || a.status !== "DELETED") return fail(db, "Only removed admins can be restored.");
  db = { ...db, admins: patch(db.admins, id, () => ({ status: "ACTIVE", deletedAt: null, deletedReason: "" })) };
  return ok(logged(db, "admin", `Restored admin ${a.name}`), `${a.name} has access again.`);
}
