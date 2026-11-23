/*
  REAL backend calls (Spring Boot). Vite forwards /api to http://localhost:8080
  (see vite.config.js). If your controllers use different URLs or field names, change them
  HERE; none of the dashboard screens need to change.

  ------------ JSON the screens expect ------------
  Item     { id, name, description, category, price, stock, imageUrl, active }
           active=false means "hidden from buyers" (deactivated)
  Order    { id, createdAt (ISO), status, customer, customerPhone, address, total, rejectReason,
             items: [{ name, category, qty, price }],
             deliveryPerson: { id, name, phone, vehicle } | null }      <- assigned by the admin
           status: PENDING, PACKED, READY_FOR_PICKUP, OUT_FOR_DELIVERY,
                   DELIVERED, CANCELLED, REJECTED, RETURNED
           The seller may only do:  PENDING->PACKED (accept)  PENDING->REJECTED  PACKED->READY_FOR_PICKUP
  Stats    { totals:   { revenue, orders, avgOrder, lowStock },          (lowStock = items with stock < 5)
             outcomes: { delivered, returned, cancelled, rejected },
             daily:    [{ date: "2026-10-01", revenue, orders }],
             byCategory: [{ category, revenue }],
             topItems:   [{ name, units }] }
  Review   { id, itemId, itemName, rating (1-5), comment, customer, createdAt }
  Profile  { shopName, phone, email, description,
             pickup: { contactPerson, contactPhone, line1, line2, landmark, city, state, pincode, hours } }
  Wallet   { balance, pendingWithdrawals, totalEarned, totalWithdrawn, commissionPct, minWithdrawal,
             transactions: [{ id, date, type: "CREDIT"|"DEBIT", description, amount,
                              balanceAfter, status: "COMPLETED"|"PENDING"|"APPROVED"|"REJECTED" }] }
*/
async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
  });
  if (!res.ok) throw new Error((await res.text()) || "Request failed (" + res.status + ")");
  return res.status === 204 ? null : res.json();
}

/* ---------- products ---------- */
// GET /api/items
export const getItems = () => request("/api/items");

// POST /api/items   (multipart form: name, description, category, price, stock, image)
export const addItem = (fields, imageFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  if (imageFile) form.append("image", imageFile);
  return request("/api/items", { method: "POST", body: form });
};

// PATCH /api/items/{id}   JSON like { price }, { stock }, { active }, { name, description, ... }
// With a new picture it is sent as a multipart form instead.
export const updateItem = (id, changes, imageFile) => {
  if (!imageFile) return request("/api/items/" + id, { method: "PATCH", body: JSON.stringify(changes) });
  const form = new FormData();
  Object.entries(changes).forEach(([k, v]) => form.append(k, v));
  form.append("image", imageFile);
  return request("/api/items/" + id, { method: "PATCH", body: form });
};

// DELETE /api/items/{id}
export const deleteItem = (id) => request("/api/items/" + id, { method: "DELETE" });

/* ---------- orders ---------- */
// GET /api/orders   (this seller's orders; the delivery person is filled in by the admin)
export const getOrders = () => request("/api/orders");

// PATCH /api/orders/{id}/status   body: { status, reason }
export const updateOrderStatus = (id, status, reason = "") =>
  request("/api/orders/" + id + "/status", { method: "PATCH", body: JSON.stringify({ status, reason }) });

/* ---------- analytics ---------- */
// GET /api/stats?days=30     days=0 means all time   (grouped by the database)
export const getStats = (days = 30) => request("/api/stats?days=" + days);

// GET /api/reviews
export const getReviews = () => request("/api/reviews");

/* ---------- shop profile ---------- */
// GET /api/profile    PUT /api/profile
export const getProfile = () => request("/api/profile");
export const saveProfile = (profile) => request("/api/profile", { method: "PUT", body: JSON.stringify(profile) });

/* ---------- wallet ---------- */
// GET /api/wallet
export const getWallet = () => request("/api/wallet");
// POST /api/wallet/withdrawals   body: { amount, payTo }
export const requestWithdrawal = (body) => request("/api/wallet/withdrawals", { method: "POST", body: JSON.stringify(body) });

/* ---------- support ---------- */
// POST /api/tickets   body: { subject, message }
export const sendTicket = (subject, message) =>
  request("/api/tickets", { method: "POST", body: JSON.stringify({ subject, message }) });
/* ---------- delivery personnel ---------- */
export const getDeliveryProfile = () => request("/api/delivery/profile");
export const saveDeliveryProfile = (data) => request("/api/delivery/profile", { method: "PUT", body: JSON.stringify(data) });
export const toggleDutyStatus = () => request("/api/delivery/duty", { method: "POST" });
export const getDeliveryShipments = () => request("/api/delivery/shipments");
export const claimShipment = (id) => request(`/api/delivery/shipments/${id}/claim`, { method: "POST" });
export const rejectShipment = (id, reason) => request(`/api/delivery/shipments/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
export const startDeliveryRun = (id) => request(`/api/delivery/shipments/${id}/start`, { method: "POST" });
export const verifyDeliveryOtp = (id, otp) => request(`/api/delivery/shipments/${id}/verify-otp`, { method: "POST", body: JSON.stringify({ otp }) });
export const getDeliveryWallet = () => request("/api/delivery/wallet");
export const requestDeliveryWithdrawal = (body) => request("/api/delivery/withdrawals", { method: "POST", body: JSON.stringify(body) });