/*
  FAKE backend for working without Spring Boot. Everything lives in the browser (localStorage),
  so changes survive a refresh. Reset the demo any time by running this in the browser console:
      localStorage.removeItem("vyapari_mock_v2")   then refresh
*/
const KEY = "vyapari_mock_v3";
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const COMMISSION = 10; // % the platform keeps from each delivered order

const SEED_ITEMS = [
  ["Fresh Broccoli (500 g)", "veggies", 79, 120, "🥦", "Farm-fresh broccoli, washed and packed the same morning."],
  ["Kashmiri Apples (1 kg)", "veggies", 189, 60, "🍎", "Crisp, sweet apples straight from the valley."],
  ["Smartphone 128 GB", "electronics", 17999, 14, "📱", "6.5 inch display, 5G, 128 GB storage, 1 year warranty."],
  ["Wireless Headphones", "electronics", 2499, 3, "🎧", "Bluetooth 5.3, 30 hour battery, noise isolation."],
  ["Cotton T-Shirt", "clothing", 499, 75, "👕", "Soft 100% cotton, regular fit, machine washable."],
  ["Printed Kurti", "clothing", 899, 4, "👗", "Block-print cotton kurti, available in S to XL."],
  ["Running Shoes", "footwear", 1999, 32, "👟", "Lightweight mesh upper with cushioned sole."],
  ["Non-stick Pan", "home", 749, 0, "🍳", "24 cm pan, induction friendly, PFOA free."],
  ["Bestselling Novel", "books", 299, 90, "📖", "The paperback everyone is talking about."],
  ["Face Moisturiser", "beauty", 349, 41, "🧴", "Light daily moisturiser with SPF 20."],
  ["Yoga Mat", "sports", 699, 26, "🧘", "6 mm non-slip mat with carry strap."],
  ["Plush Teddy Bear", "toys", 549, 18, "🧸", "Super soft 40 cm teddy. Currently hidden from buyers."],
].map(([name, category, price, stock, emoji, description], i) => ({
  id: i + 1,
  name,
  category,
  mrp: Math.round(price * 1.35),
  price,
  stock,
  emoji,
  description,
  imageUrl: "",
  active: name !== "Plush Teddy Bear",
}));

const PEOPLE = [
  { id: 1, name: "Amit Kumar", phone: "+91 98765 43210", vehicle: "Hero Splendor (WB-02-4412)" },
  { id: 2, name: "Vikram Das", phone: "+91 91234 56789", vehicle: "Electric Scooter (WB-04-1192)" },
  { id: 3, name: "Priya Nair", phone: "+91 99001 22334", vehicle: "Honda Activa (WB-06-7781)" },
];
const CUSTOMERS = ["Anita Rao", "Karan Mehta", "Sana Iqbal", "Rohit Das", "Meera Joshi", "Dev Patel", "Isha Roy", "Nikhil Jain"];
const AREAS = ["Salt Lake, Kolkata", "Park Street, Kolkata", "Howrah", "Behala, Kolkata", "New Town, Kolkata", "Dum Dum"];
const COMMENTS = [
  [5, "Exactly as described, arrived quickly!"],
  [5, "Great quality for the price. Would buy again."],
  [4, "Good product, packaging could be better."],
  [4, "Nice, works well. Delivery was a day late."],
  [3, "Okay for the price, nothing special."],
  [2, "Smaller than I expected."],
  [1, "Arrived damaged. Had to return it."],
  [5, "Fresh and well packed. Loved it."],
  [4, "Happy with it overall."],
];

// small repeatable random numbers, so the demo always looks the same
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function pickStatus(day, rand) {
  if (day === 0) return ["PENDING", "PENDING", "PENDING", "PACKED", "READY_FOR_PICKUP"][Math.floor(rand() * 5)];
  if (day === 1) return ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "DELIVERED", "DELIVERED"][Math.floor(rand() * 4)];
  const r = rand();
  if (r < 0.05) return "CANCELLED";
  if (r < 0.09) return "RETURNED";
  if (r < 0.11) return "REJECTED";
  return "DELIVERED";
}

function seedOrders(items) {
  const rand = rng(42);
  const orders = [];
  const now = Date.now();
  let id = 1000;
  for (let day = 59; day >= 0; day--) {
    const count = 2 + Math.floor(rand() * 4 + (day % 7 === 5 || day % 7 === 6 ? 2 : 0));
    for (let k = 0; k < count; k++) {
      const lines = [];
      const n = 1 + Math.floor(rand() * 3);
      for (let j = 0; j < n; j++) {
        const it = items[Math.floor(rand() * items.length)];
        lines.push({ name: it.name, category: it.category, qty: 1 + Math.floor(rand() * 3), price: it.price });
      }
      const status = pickStatus(day, rand);
      const hasCourier =
        ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"].includes(status) || (status === "PACKED" && rand() > 0.5);
      orders.push({
        id: ++id,
        createdAt: new Date(now - day * 864e5 - Math.floor(rand() * 8) * 36e5).toISOString(),
        status,
        customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
        customerPhone: "+91 9" + Math.floor(100000000 + rand() * 899999999),
        address: AREAS[Math.floor(rand() * AREAS.length)],
        items: lines,
        total: lines.reduce((s, l) => s + l.qty * l.price, 0),
        deliveryPerson: hasCourier ? PEOPLE[Math.floor(rand() * PEOPLE.length)] : null,
        rejectReason: status === "REJECTED" ? "Item not available right now" : "",
      });
    }
  }
  return orders.reverse(); // newest first
}

function seedReviews(items) {
  const rand = rng(7);
  const out = [];
  for (let i = 0; i < 48; i++) {
    const item = items[Math.floor(rand() * items.length)];
    const [rating, comment] = COMMENTS[Math.floor(rand() * COMMENTS.length)];
    out.push({
      id: i + 1,
      itemId: item.id,
      itemName: item.name,
      rating,
      comment,
      customer: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)],
      createdAt: new Date(Date.now() - Math.floor(rand() * 55) * 864e5).toISOString(),
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const SEED_PROFILE = {
  ownerName: "Suresh Agarwal",
  shopName: "Green Basket Traders",
  phone: "9830012345",
  email: "hello@greenbasket.example",
  description: "Fresh produce, everyday electronics and clothing from a family-run store in Kolkata.",
  gstin: "19AAACG1234M1Z5",
  pickup: {
    contactPerson: "Suresh Agarwal",
    contactPhone: "9830012345",
    houseNumber: "Plot 12B",
    streetAddress: "Lake Road Market",
    landmark: "Near Rabindra Sarobar Metro Gate 2",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700029",
    hours: "10:00 am - 7:00 pm, Monday to Saturday",
  },
  bank: {
    bankName: "State Bank of India",
    accountNumber: "309812345678",
    ifscCode: "SBIN0001234",
  },
};

function seedWithdrawals() {
  const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
  return [
    { id: 1, date: d(40), amount: 50000, payTo: "greenbasket@upi", status: "APPROVED" },
    { id: 2, date: d(20), amount: 75000, payTo: "greenbasket@upi", status: "APPROVED" },
    { id: 3, date: d(2), amount: 20000, payTo: "greenbasket@upi", status: "PENDING" },
  ];
}

function seedDeliveryWithdrawals() {
  const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
  return [
    { id: 1, date: d(15), amount: 800, payTo: "amit@upi", status: "APPROVED" },
    { id: 2, date: d(3), amount: 400, payTo: "amit@upi", status: "APPROVED" },
  ];
}

const SEED_DELIVERY_AGENT = {
  id: 1,
  name: "Amit Kumar",
  email: "amit.courier@vyapari.example",
  phone: "9876543210",
  vehicleType: "Two-Wheeler",
  vehicleNumber: "WB-02-4412",
  drivingLicense: "DL-0420110023456",
  adminStatus: "APPROVED", // PENDING, APPROVED, BANNED
  dutyStatus: 1, // 1 = Available for duty, 0 = Off-duty
  pincodes: ["700029", "700150", "700019", "700025"],
  bankName: "Punjab National Bank",
  accountNumber: "0234001500098765",
  ifscCode: "PUNB0023400",
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.items && saved.orders) {
      if (!saved.deliveryAgent) saved.deliveryAgent = SEED_DELIVERY_AGENT;
      if (!saved.deliveryWithdrawals) saved.deliveryWithdrawals = seedDeliveryWithdrawals();
      return saved;
    }
  } catch {
    /* ignore */
  }
  const db = {
    items: SEED_ITEMS,
    orders: seedOrders(SEED_ITEMS),
    reviews: seedReviews(SEED_ITEMS),
    profile: SEED_PROFILE,
    withdrawals: seedWithdrawals(),
    tickets: [],
    deliveryAgent: SEED_DELIVERY_AGENT,
    deliveryWithdrawals: seedDeliveryWithdrawals(),
    nextId: 100,
  };
  save(db);
  return db;
}
function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: the demo still works until refresh */
  }
}

// shrink the picture so it fits in localStorage (the real backend receives it as a file)
function fileToSmallDataUrl(file, max = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("That file is not a picture"));
    img.src = url;
  });
}

/* ---------------- products ---------------- */
export async function getItems() {
  await wait();
  return load().items;
}

export async function addItem(fields, imageFile) {
  await wait(400);
  const db = load();
  const sellingPrice = Number(fields.price);
  const mrp = Number(fields.mrp) > 0 ? Number(fields.mrp) : Math.round(sellingPrice * 1.35);
  const item = {
    id: db.nextId++,
    name: fields.name,
    description: fields.description || "",
    category: fields.category,
    mrp,
    price: sellingPrice,
    stock: Number(fields.stock),
    emoji: "",
    active: true,
    imageUrl: imageFile ? await fileToSmallDataUrl(imageFile) : "",
  };
  db.items = [item, ...db.items];
  save(db);
  return item;
}

// changes can hold: name, description, category, mrp, price, stock, active. imageFile is optional.
export async function updateItem(id, changes, imageFile) {
  await wait(200);
  const db = load();
  const patch = { ...changes };
  if ("price" in patch) patch.price = Number(patch.price);
  if ("mrp" in patch) patch.mrp = Number(patch.mrp);
  if ("stock" in patch) patch.stock = Number(patch.stock);
  if (imageFile) patch.imageUrl = await fileToSmallDataUrl(imageFile);
  db.items = db.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  save(db);
  return db.items.find((i) => i.id === id);
}

export async function deleteItem(id) {
  await wait(200);
  const db = load();
  db.items = db.items.filter((i) => i.id !== id);
  save(db);
}

/* ---------------- orders ---------------- */
export async function getOrders() {
  await wait();
  return load().orders;
}

// The seller can only move an order through these steps (the backend must enforce the same):
//   PENDING -> PACKED (accept)   PENDING -> REJECTED   PACKED -> READY_FOR_PICKUP
const NEXT = { PENDING: ["PACKED", "REJECTED"], PACKED: ["READY_FOR_PICKUP"] };

export async function updateOrderStatus(id, status, reason = "") {
  await wait(300);
  const db = load();
  const order = db.orders.find((o) => o.id === id);
  if (!order) throw new Error("Order not found");
  if (!(NEXT[order.status] || []).includes(status)) throw new Error("This order can't move from " + order.status + " to " + status);
  order.status = status;
  if (status === "REJECTED") order.rejectReason = reason || "Rejected by seller";
  save(db);
  return order;
}

/* ---------------- analytics ---------------- */
const SALES = ["PACKED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED"]; // orders that count as sales

// days = 7, 30 ... or 0 for all time. (The real backend does this with SQL GROUP BY.)
export async function getStats(days = 30) {
  await wait();
  const { orders, items } = load();
  const span = days || 60;
  const since = days ? Date.now() - days * 864e5 : 0;
  const inRange = orders.filter((o) => new Date(o.createdAt).getTime() >= since);
  const sales = inRange.filter((o) => SALES.includes(o.status));

  const byDay = {};
  for (let d = span - 1; d >= 0; d--) {
    const key = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    byDay[key] = { date: key, revenue: 0, orders: 0 };
  }
  const byCat = {};
  const units = {};
  sales.forEach((o) => {
    const key = o.createdAt.slice(0, 10);
    if (byDay[key]) {
      byDay[key].revenue += o.total;
      byDay[key].orders += 1;
    }
    o.items.forEach((l) => {
      byCat[l.category] = (byCat[l.category] || 0) + l.qty * l.price;
      units[l.name] = (units[l.name] || 0) + l.qty;
    });
  });

  const count = (s) => inRange.filter((o) => o.status === s).length;
  const revenue = sales.reduce((s, o) => s + o.total, 0);
  const commission = Math.round((revenue * COMMISSION) / 100);
  const sellerEarnings = revenue - commission;
  return {
    totals: {
      revenue,
      commission,
      sellerEarnings,
      commissionRate: COMMISSION,
      orders: sales.length,
      avgOrder: sales.length ? Math.round(revenue / sales.length) : 0,
      lowStock: items.filter((i) => i.stock < 5).length,
    },
    outcomes: {
      delivered: count("DELIVERED"),
      returned: count("RETURNED"),
      cancelled: count("CANCELLED"),
      rejected: count("REJECTED"),
    },
    daily: Object.values(byDay),
    byCategory: Object.entries(byCat)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    topItems: Object.entries(units)
      .map(([name, u]) => ({ name, units: u }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5),
  };
}

/* ---------------- reviews ---------------- */
export async function getReviews() {
  await wait();
  return load().reviews;
}

/* ---------------- shop profile ---------------- */
export async function getProfile() {
  await wait(150);
  return load().profile;
}
export async function saveProfile(profile) {
  await wait(400);
  const db = load();
  db.profile = profile;
  save(db);
  return profile;
}

/* ---------------- wallet ---------------- */
export async function getWallet() {
  await wait();
  const db = load();
  const rows = [];
  db.orders
    .filter((o) => o.status === "DELIVERED")
    .forEach((o) => {
      const fee = Math.round((o.total * COMMISSION) / 100);
      rows.push({
        id: "o" + o.id,
        date: new Date(new Date(o.createdAt).getTime() + 864e5).toISOString(),
        type: "CREDIT",
        description: "Order ORD-" + o.id + " delivered (after " + COMMISSION + "% platform fee)",
        amount: o.total - fee,
        status: "COMPLETED",
      });
    });
  db.withdrawals.forEach((w) =>
    rows.push({
      id: "w" + w.id,
      date: w.date,
      type: "DEBIT",
      description: "Withdrawal to " + w.payTo,
      amount: w.amount,
      status: w.status, // PENDING, APPROVED or REJECTED
    })
  );

  rows.sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  rows.forEach((r) => {
    if (r.type === "CREDIT") bal += r.amount;
    else if (r.status !== "REJECTED") bal -= r.amount; // a rejected withdrawal gives the money back
    r.balanceAfter = bal;
  });

  const sum = (f) => rows.filter(f).reduce((s, r) => s + r.amount, 0);
  return {
    balance: bal,
    pendingWithdrawals: sum((r) => r.type === "DEBIT" && r.status === "PENDING"),
    totalEarned: sum((r) => r.type === "CREDIT"),
    totalWithdrawn: sum((r) => r.type === "DEBIT" && r.status === "APPROVED"),
    commissionPct: COMMISSION,
    minWithdrawal: 100,
    transactions: rows.reverse(), // newest first
  };
}

export async function requestWithdrawal({ amount, payTo }) {
  await wait(500);
  const wallet = await getWallet();
  const n = Number(amount);
  if (!(n >= wallet.minWithdrawal)) throw new Error("The minimum withdrawal is ₹" + wallet.minWithdrawal);
  if (n > wallet.balance) throw new Error("That is more than your available balance");
  const db = load();
  db.withdrawals.push({ id: db.nextId++, date: new Date().toISOString(), amount: n, payTo, status: "PENDING" });
  save(db);
  return { ok: true };
}

/* ---------------- support ---------------- */
export async function sendTicket(subject, message) {
  await wait(500);
  const db = load();
  db.tickets = [{ id: Date.now(), subject, message, createdAt: new Date().toISOString() }, ...(db.tickets || [])];
  save(db);
  return { ok: true };
}

/* ---------------- delivery personnel ---------------- */
const DELIVERY_RATE = 40; // ₹40 per delivered order

export async function getDeliveryProfile() {
  await wait(150);
  const db = load();
  if (!db.deliveryAgent) {
    db.deliveryAgent = SEED_DELIVERY_AGENT;
    save(db);
  }
  return db.deliveryAgent;
}

export async function saveDeliveryProfile(patch) {
  await wait(300);
  const db = load();
  db.deliveryAgent = { ...(db.deliveryAgent || SEED_DELIVERY_AGENT), ...patch };
  save(db);
  return db.deliveryAgent;
}

export async function toggleDutyStatus() {
  await wait(150);
  const db = load();
  const current = db.deliveryAgent?.dutyStatus ?? 1;
  const next = current === 1 ? 0 : 1;
  db.deliveryAgent = { ...(db.deliveryAgent || SEED_DELIVERY_AGENT), dutyStatus: next };
  save(db);
  return next;
}

export async function getDeliveryShipments() {
  await wait(250);
  const db = load();
  const agent = db.deliveryAgent || SEED_DELIVERY_AGENT;
  const pins = agent.pincodes || [];

  db.orders.forEach((o, idx) => {
    if (!o.pincode) o.pincode = pins[idx % pins.length] || "700029";
    if (!o.seller) {
      o.seller = {
        shopName: db.profile?.shopName || "Green Basket Traders",
        phone: db.profile?.phone || "9830012345",
        pickupAddress: `${db.profile?.pickup?.houseNumber || "Plot 12B"}, ${db.profile?.pickup?.streetAddress || "Lake Road"}, ${db.profile?.pickup?.city || "Kolkata"} - ${db.profile?.pickup?.pincode || "700029"}`,
      };
    }
    if (!o.otp && o.status === "OUT_FOR_DELIVERY") {
      o.otp = String(1000 + ((o.id * 73) % 9000));
    }
  });

  // Active trips assigned to this courier: READY_FOR_PICKUP or OUT_FOR_DELIVERY
  const active = db.orders.filter(
    (o) =>
      o.deliveryPerson &&
      (String(o.deliveryPerson.id) === String(agent.id) || o.deliveryPerson.name === agent.name) &&
      ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"].includes(o.status)
  );

  // If driver has no active trip in demo, assign one ready order so they can immediately test
  if (active.length === 0) {
    let sample = db.orders.find((o) => o.status === "READY_FOR_PICKUP" && !o.deliveryPerson);
    if (!sample) {
      sample = db.orders.find((o) => o.status === "PACKED") || db.orders[0];
      if (sample) sample.status = "READY_FOR_PICKUP";
    }
    if (sample) {
      sample.deliveryPerson = {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        vehicle: agent.vehicleType + " (" + agent.vehicleNumber + ")",
      };
      active.push(sample);
    }
  }

  // Ensure there are also available orders in the pool
  let available = db.orders.filter(
    (o) =>
      o.status === "READY_FOR_PICKUP" &&
      !o.deliveryPerson &&
      (pins.length === 0 || pins.includes(o.pincode))
  );

  if (available.length === 0) {
    const second = db.orders.find((o) => o.status === "PACKED" && o.id !== active[0]?.id);
    if (second) {
      second.status = "READY_FOR_PICKUP";
      second.deliveryPerson = null;
      second.pincode = pins[0] || "700029";
      available.push(second);
    }
  }

  const history = db.orders.filter(
    (o) =>
      o.status === "DELIVERED" &&
      (o.deliveryPerson?.id === agent.id || o.deliveryPerson?.name === agent.name)
  );

  save(db);
  return { active, available, history, dutyStatus: agent.dutyStatus, agent };
}

export async function claimShipment(orderId) {
  await wait(300);
  const db = load();
  const agent = db.deliveryAgent || SEED_DELIVERY_AGENT;
  if (!agent.dutyStatus) {
    throw new Error("You must turn ON your Duty Status before claiming shipments.");
  }
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Order not found");
  if (order.deliveryPerson) throw new Error("This shipment was already claimed by another driver.");
  order.deliveryPerson = {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    vehicle: agent.vehicleType + " (" + agent.vehicleNumber + ")",
  };
  save(db);
  return order;
}

export async function rejectShipment(orderId, reason = "Vehicle breakdown / emergency") {
  await wait(300);
  const db = load();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Order not found");
  order.deliveryPerson = null;
  order.courierNote = reason;
  save(db);
  return order;
}

export async function startDeliveryRun(orderId) {
  await wait(350);
  const db = load();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "READY_FOR_PICKUP") {
    throw new Error("Order must be picked up from seller before starting run.");
  }
  order.status = "OUT_FOR_DELIVERY";
  order.otp = String(Math.floor(1000 + Math.random() * 9000));
  save(db);
  return order;
}

export async function verifyDeliveryOtp(orderId, enteredOtp) {
  await wait(450);
  const db = load();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "OUT_FOR_DELIVERY") {
    throw new Error("Order is not currently out for delivery.");
  }

  const clean = String(enteredOtp || "").trim();
  if (order.otp && order.otp !== clean && clean !== "1234") {
    throw new Error("Invalid 4-digit OTP. Please ask the customer for the correct delivery code.");
  }

  order.status = "DELIVERED";
  order.deliveredAt = new Date().toISOString();
  save(db);
  return order;
}

export async function getDeliveryWallet() {
  await wait(200);
  const db = load();
  const agent = db.deliveryAgent || SEED_DELIVERY_AGENT;
  const delivered = db.orders.filter(
    (o) =>
      o.status === "DELIVERED" &&
      (o.deliveryPerson?.id === agent.id || o.deliveryPerson?.name === agent.name)
  );

  const withdrawals = db.deliveryWithdrawals || [];

  const rows = [];
  delivered.forEach((o) => {
    rows.push({
      id: "del-" + o.id,
      date: o.deliveredAt || o.createdAt,
      type: "CREDIT",
      description: `Delivery payout for ORD-${o.id} (${o.customer}, ${o.pincode})`,
      amount: DELIVERY_RATE,
      status: "COMPLETED",
    });
  });

  withdrawals.forEach((w) => {
    rows.push({
      id: "w-" + w.id,
      date: w.date,
      type: "DEBIT",
      description: `Withdrawal to ${w.payTo}`,
      amount: w.amount,
      status: w.status,
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  rows.forEach((r) => {
    if (r.type === "CREDIT") balance += r.amount;
    else if (r.status !== "REJECTED") balance -= r.amount;
    r.balanceAfter = balance;
  });

  const sum = (f) => rows.filter(f).reduce((s, r) => s + r.amount, 0);

  return {
    balance,
    ratePerDelivery: DELIVERY_RATE,
    totalDelivered: delivered.length,
    totalEarned: sum((r) => r.type === "CREDIT"),
    totalWithdrawn: sum((r) => r.type === "DEBIT" && r.status === "APPROVED"),
    pendingWithdrawals: sum((r) => r.type === "DEBIT" && r.status === "PENDING"),
    minWithdrawal: 100,
    transactions: rows.reverse(),
  };
}

export async function requestDeliveryWithdrawal({ amount, payTo }) {
  await wait(450);
  const wallet = await getDeliveryWallet();
  const n = Number(amount);
  if (!(n >= wallet.minWithdrawal)) {
    throw new Error(`The minimum withdrawal is ₹${wallet.minWithdrawal}.`);
  }
  if (n > wallet.balance) {
    throw new Error(`Insufficient wallet balance. You have ₹${wallet.balance}.`);
  }
  const db = load();
  if (!db.deliveryWithdrawals) db.deliveryWithdrawals = [];
  db.deliveryWithdrawals.push({
    id: db.nextId++,
    date: new Date().toISOString(),
    amount: n,
    payTo,
    status: "PENDING",
  });
  save(db);
  return { ok: true };
}