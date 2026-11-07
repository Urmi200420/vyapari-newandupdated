// Admin dashboard: data model and store actions (no browser needed)
import test from "node:test";
import assert from "node:assert/strict";
import { buildSeed, COMMISSION_RATE, CURRENT_ADMIN_ID } from "../src/admin/data/seed.js";
import { dailySeries, money, sumRows, bucketize } from "../src/admin/data/finance.js";
import * as A from "../src/admin/data/store.js";

const NOW = Date.UTC(2026, 10, 6, 10, 0);
const fresh = () => buildSeed(NOW);

test("seed is deterministic and internally consistent", () => {
  const a = fresh();
  const b = fresh();
  assert.deepEqual(a.orders.map((o) => o.amount), b.orders.map((o) => o.amount));
  for (const o of a.orders) {
    assert.equal(o.amount, o.items.reduce((s, i) => s + i.qty * i.price, 0), o.id + " amount");
    if (o.status === "IN_TRANSIT" || o.status === "DELIVERED") assert.ok(o.deliveryPersonId, o.id + " needs a courier");
    const courier = a.delivery.find((d) => d.id === o.deliveryPersonId);
    if (courier) assert.ok(courier.pincodes.includes(o.pincode), o.id + " courier serves pincode");
  }
  for (const c of a.customers) assert.ok(c.lastActiveAt >= c.registeredAt, c.id + " seen after sign-up");
});

test("money adds up: seller earnings + commission = sales − refunds", () => {
  const db = fresh();
  const m = money(sumRows(dailySeries(db, NOW)));
  assert.equal(m.sellerEarnings + m.commission, m.gross - m.refunds);
  assert.equal(m.commission, Math.round((m.gross - m.refunds) * COMMISSION_RATE));
  assert.equal(m.platformNet, m.commission - m.courierPayouts);
  // every graph period covers the same days it claims to, and totals match the daily rows they group
  const series = dailySeries(db, NOW);
  for (const p of ["daily", "weekly", "monthly"]) {
    const buckets = bucketize(series, p);
    const days = buckets.reduce((s, x) => s + x.days, 0);
    assert.equal(buckets.reduce((s, x) => s + x.gross, 0), sumRows(series.slice(-days)).gross, p);
  }
  assert.equal(bucketize(series, "yearly").reduce((s, x) => s + x.gross, 0), m.gross);
});

test("seller approval flow", () => {
  let db = fresh();
  const p = db.sellers.find((s) => s.status === "PENDING");
  db = A.approveSeller(db, p.id).db;
  assert.equal(db.sellers.find((s) => s.id === p.id).status, "ACTIVE");
  assert.ok(A.approveSeller(db, p.id).error, "cannot approve twice");
  const q = db.sellers.find((s) => s.status === "PENDING");
  db = A.rejectSeller(db, q.id, "Missing KYC").db;
  assert.equal(db.sellers.find((s) => s.id === q.id).status, "REJECTED");
  db = A.blockSeller(db, p.id, "Test").db;
  assert.equal(db.sellers.find((s) => s.id === p.id).status, "BLOCKED");
  db = A.reactivateSeller(db, p.id).db;
  assert.equal(db.sellers.find((s) => s.id === p.id).status, "ACTIVE");
  assert.equal(db.log.length, 4);
});

test("assigning a courier updates the order", () => {
  let db = fresh();
  const o = db.orders.find((x) => ["CONFIRMED", "PROCESSING"].includes(x.status) && !x.deliveryPersonId);
  const d = db.delivery.find((x) => x.status === "ACTIVE" && x.availability !== "OFF_DUTY" && x.pincodes.includes(o.pincode)) || db.delivery.find((x) => x.status === "ACTIVE" && x.availability !== "OFF_DUTY");
  db = A.assignOrder(db, o.id, d.id).db;
  assert.equal(db.orders.find((x) => x.id === o.id).deliveryPersonId, d.id);
  const off = db.delivery.find((x) => x.availability === "OFF_DUTY");
  const other = db.orders.find((x) => ["CONFIRMED", "PROCESSING"].includes(x.status) && !x.deliveryPersonId);
  if (off && other) assert.ok(A.assignOrder(db, other.id, off.id).error, "off-duty courier refused");
  db = A.unassignOrder(db, o.id).db;
  assert.equal(db.orders.find((x) => x.id === o.id).deliveryPersonId, null);
});

test("approving a refund changes payment status and refund totals", () => {
  let db = fresh();
  const before = money(sumRows(dailySeries(db))).refunds;
  const r = db.refunds.find((x) => x.status === "PENDING");
  db = A.decideRefund(db, r.id, true, "").db;
  assert.equal(db.refunds.find((x) => x.id === r.id).status, "APPROVED");
  assert.match(db.orders.find((x) => x.id === r.orderId).payment, /REFUND/);
  assert.equal(money(sumRows(dailySeries(db))).refunds, before + r.amount);
  assert.ok(A.decideRefund(db, r.id, false, "x").error, "cannot decide twice");
});

test("tickets, catalogue and admins", () => {
  let db = fresh();
  const t = db.tickets.find((x) => x.status === "OPEN");
  db = A.updateTicket(db, t.id, { status: "RESOLVED" }, "Fixed").db;
  const t2 = db.tickets.find((x) => x.id === t.id);
  assert.equal(t2.status, "RESOLVED");
  assert.ok(t2.resolvedAt);
  assert.equal(t2.notes.at(-1).text, "Fixed");

  db = A.saveCategory(db, null, { name: "Pet Supplies", icon: "🐶" }).db;
  assert.ok(A.saveCategory(db, null, { name: "pet supplies" }).error, "duplicate names refused");
  db = A.saveSubcategory(db, "pet-supplies", null, "Dog Food").db;
  assert.equal(db.categories.find((c) => c.id === "pet-supplies").subcategories.length, 1);
  db = A.deleteCategory(db, "pet-supplies").db;
  assert.equal(db.categories.some((c) => c.id === "pet-supplies"), false);

  db = A.addAdmin(db, { name: "Test Admin", email: "t@vyapari.example", phone: "", role: "Support Lead" }).db;
  const added = db.admins.at(-1);
  db = A.softDeleteAdmin(db, added.id, "Left").db;
  assert.equal(db.admins.find((a) => a.id === added.id).status, "DELETED", "record kept, marked deleted");
  assert.ok(A.softDeleteAdmin(db, CURRENT_ADMIN_ID).error, "cannot remove yourself");
});

test("tickets raised in other dashboards are imported once", () => {
  const storage = new Map([
    ["vyapari_tickets_v1", JSON.stringify([{ id: 1, category: "Other", priority: "URGENT", subject: "Flat tyre", message: "help", status: "OPEN", raisedBy: "Amit Kumar", createdAt: new Date(NOW).toISOString() }])],
    ["vyapari_mock_v3", JSON.stringify({ profile: { ownerName: "Suresh Agarwal", shopName: "Green Basket Traders" }, tickets: [{ id: 2, subject: "Payout for VYP-20500", message: "late", createdAt: new Date(NOW).toISOString() }] })],
  ]);
  const ext = A.readExternalTickets({ getItem: (k) => storage.get(k) ?? null });
  assert.equal(ext.length, 2);
  let db = A.importExternalTickets(fresh(), ext);
  const live = db.tickets.filter((t) => t.source === "live");
  assert.equal(live.length, 2);
  assert.equal(live.find((t) => t.userType === "seller").orderId, "VYP-20500");
  assert.equal(live.find((t) => t.userType === "delivery").raisedById, "DLV-201");
  assert.equal(A.importExternalTickets(db, ext), null, "no duplicates on the next sync");
});
