// Delivery-partner approval calls for the admin panel.
// Backend: GET /api/admin/delivery-partners[?status=PENDING], POST /api/admin/delivery-partners/{id}/{approve|reject|block|unblock}
// A partner looks like: { id, name, email, phone, status, createdAt, ...application details, hasIdentityDocument,
//   hasLicenceDocument, hasVehicleRcDocument, identityDocumentNumberMasked, drivingLicenseNumberMasked, rejectionReason }
// (status: PENDING, ACTIVE, REJECTED, BLOCKED)

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
export const rejectDelivery = (id, reason) => call(`/api/admin/delivery-partners/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
export const blockDelivery = (id) => call(`/api/admin/delivery-partners/${id}/block`, { method: "POST" });
export const unblockDelivery = (id) => call(`/api/admin/delivery-partners/${id}/unblock`, { method: "POST" });
// Admin-only document stream -> { url (object URL, revoke when done), type }. Never cached by the browser.
export const fetchDeliveryDocument = async (id, kind) => {
  let res;
  try {
    res = await fetch(`/api/admin/delivery-partners/${id}/documents/${kind}`, { credentials: "include", cache: "no-store" });
  } catch {
    throw new Error("Could not reach the server");
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please log in again as admin.");
    if (res.status === 403) throw new Error("Only admins can view verification documents.");
    if (res.status === 404) throw new Error("This document was not found.");
    throw new Error("Could not retrieve this document.");
  }
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), type: blob.type || res.headers.get("Content-Type") || "" };
};
