// Delivery-partner approval calls for the admin panel.
// Backend: GET /api/admin/delivery-partners[?status=PENDING], POST /api/admin/delivery-partners/{id}/{approve|reject|block|unblock}
// A partner looks like: { id, name, email, phone, status, createdAt }  (status: PENDING, ACTIVE, REJECTED, BLOCKED)

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw new Error("Could not reach the server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please log in again as admin.");
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const fetchDeliveryPartners = (status) =>
  call("/api/admin/delivery-partners" + (status ? `?status=${encodeURIComponent(status)}` : ""));

export const approveDelivery = (id) => call(`/api/admin/delivery-partners/${id}/approve`, { method: "POST" });
export const rejectDelivery = (id) => call(`/api/admin/delivery-partners/${id}/reject`, { method: "POST" });
export const blockDelivery = (id) => call(`/api/admin/delivery-partners/${id}/block`, { method: "POST" });
export const unblockDelivery = (id) => call(`/api/admin/delivery-partners/${id}/unblock`, { method: "POST" });