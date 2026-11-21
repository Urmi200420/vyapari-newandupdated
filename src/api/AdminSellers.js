// Real seller-approval calls for the admin panel.
// Backend: GET /api/admin/sellers[?status=PENDING], POST /api/admin/sellers/{id}/{approve|reject|block|unblock}
// A seller looks like: { id, name, email, phone, shopName, city, status, createdAt }
// status is one of PENDING, ACTIVE, REJECTED, BLOCKED

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

export const fetchSellers = (status) =>
  call("/api/admin/sellers" + (status ? `?status=${encodeURIComponent(status)}` : ""));

export const approveSeller = (id) => call(`/api/admin/sellers/${id}/approve`, { method: "POST" });
export const rejectSeller = (id) => call(`/api/admin/sellers/${id}/reject`, { method: "POST" });
export const blockSeller = (id) => call(`/api/admin/sellers/${id}/block`, { method: "POST" });
export const unblockSeller = (id) => call(`/api/admin/sellers/${id}/unblock`, { method: "POST" });