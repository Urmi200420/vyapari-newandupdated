/*
  Platform money maths. Pure functions (no React), so every screen gets the same numbers.
  See the comment at the top of seed.js for the definitions.
*/
import { buildArchive, dayKey, COMMISSION_RATE, COURIER_RATE, SETTLEMENT_DAYS, LEDGER_DAYS, DAY } from "./seed.js";

export const REFUND_COUNTED = ["APPROVED", "COMPLETED"];

const archiveCache = new Map();
function archiveFor(seededAt) {
  if (!archiveCache.has(seededAt)) archiveCache.set(seededAt, buildArchive(seededAt));
  return archiveCache.get(seededAt);
}

// one row per calendar day, oldest first: { date, t, orders, cancelled, delivered, gross, refunds }
export function dailySeries(db, now = Date.now()) {
  const rows = new Map();
  for (const r of archiveFor(db.seededAt)) rows.set(r.date, { ...r });
  const row = (t) => {
    const k = dayKey(t);
    if (!rows.has(k)) {
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      rows.set(k, { date: k, t: d.getTime(), orders: 0, cancelled: 0, delivered: 0, gross: 0, refunds: 0 });
    }
    return rows.get(k);
  };
  // make sure every ledger day exists, even quiet ones
  const first = new Date(db.seededAt);
  first.setHours(0, 0, 0, 0);
  for (let t = first.getTime() - (LEDGER_DAYS - 1) * DAY; t <= now; t += DAY) row(t);

  for (const o of db.orders) {
    const r = row(Date.parse(o.createdAt));
    r.orders++;
    if (o.status === "CANCELLED") r.cancelled++;
    else r.gross += o.amount;
    if (o.status === "DELIVERED") r.delivered++;
  }
  for (const f of db.refunds) if (REFUND_COUNTED.includes(f.status) && f.decidedAt) row(Date.parse(f.decidedAt)).refunds += f.amount;
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

// turn raw sums into the money figures
export function money(sum) {
  const net = sum.gross - sum.refunds;
  const commission = Math.round(net * COMMISSION_RATE);
  const sellerEarnings = net - commission;
  const courierPayouts = sum.delivered * COURIER_RATE;
  return { ...sum, netSales: net, commission, sellerEarnings, courierPayouts, platformNet: commission - courierPayouts };
}

export function sumRows(rows) {
  return rows.reduce(
    (s, r) => ({
      orders: s.orders + r.orders,
      cancelled: s.cancelled + r.cancelled,
      delivered: s.delivered + r.delivered,
      gross: s.gross + r.gross,
      refunds: s.refunds + r.refunds,
    }),
    { orders: 0, cancelled: 0, delivered: 0, gross: 0, refunds: 0 }
  );
}

// seller money that is owed but not yet paid: delivered in the last SETTLEMENT_DAYS days, minus refunds on those orders
export function pendingSettlements(db, now = Date.now()) {
  const cutoff = now - SETTLEMENT_DAYS * DAY;
  const refunded = new Map();
  for (const f of db.refunds) if (REFUND_COUNTED.includes(f.status)) refunded.set(f.orderId, (refunded.get(f.orderId) || 0) + f.amount);
  let total = 0;
  let count = 0;
  for (const o of db.orders) {
    if (o.status !== "DELIVERED" || !o.deliveredAt || Date.parse(o.deliveredAt) < cutoff) continue;
    const net = Math.max(0, o.amount - (refunded.get(o.id) || 0));
    total += net - Math.round(net * COMMISSION_RATE);
    count++;
  }
  return { total, count };
}

/*
  Graph buckets.
    daily   → last 30 days
    weekly  → last 12 weeks (Mon–Sun)
    monthly → last 12 months
    yearly  → every calendar year in the data
*/
export const PERIODS = {
  daily: { label: "Daily", note: "last 30 days" },
  weekly: { label: "Weekly", note: "last 12 weeks" },
  monthly: { label: "Monthly", note: "last 12 months" },
  yearly: { label: "Yearly", note: "all years" },
};

export function bucketize(series, period) {
  const groups = new Map();
  const add = (key, label, sub, r) => {
    if (!groups.has(key)) groups.set(key, { key, label, sub, rows: [] });
    groups.get(key).rows.push(r);
  };
  for (const r of series) {
    const d = new Date(r.t);
    if (period === "daily") add(r.date, d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), d.toLocaleDateString("en-IN", { weekday: "long" }), r);
    else if (period === "weekly") {
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const sunday = new Date(monday.getTime() + 6 * DAY);
      const f = (x) => x.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      add(dayKey(monday), f(monday), f(monday) + " – " + f(sunday), r);
    } else if (period === "monthly") add(d.getFullYear() + "-" + d.getMonth(), d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }), d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), r);
    else add(String(d.getFullYear()), String(d.getFullYear()), "Calendar year " + d.getFullYear(), r);
  }
  let list = [...groups.values()];
  const keep = { daily: 30, weekly: 12, monthly: 12, yearly: 99 }[period];
  list = list.slice(-keep);
  return list.map((g) => ({ key: g.key, label: g.label, sub: g.sub, days: g.rows.length, ...money(sumRows(g.rows)) }));
}

// "▲ 12.4%" style change between two numbers (null when there is nothing to compare)
export function change(now, before) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

// count records created in [from, to)
export const countBetween = (list, field, from, to) => list.filter((x) => {
  const t = Date.parse(x[field]);
  return t >= from && t < to;
}).length;
