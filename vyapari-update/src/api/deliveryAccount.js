// The logged-in delivery partner's own account on Spring Boot (used while VITE_REAL_DELIVERY_AUTH=true).
// GET /api/delivery/profile, PUT /api/delivery/profile { name, phone, pincodes }
// Shipments, wallet and duty status are not built on the backend yet and keep using the demo data in api/mock.js.

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw Object.assign(new Error("Could not reach the server. Check that Spring Boot is running."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const REAL_DELIVERY = import.meta.env.VITE_REAL_DELIVERY_AUTH === "true" || import.meta.env.VITE_REAL_AUTH === "true";
export const getMyDeliveryAccount = () => call("/api/delivery/profile");
export const saveMyDeliveryAccount = ({ name, phone, pincodes }) =>
  call("/api/delivery/profile", { method: "PUT", body: JSON.stringify({ name, phone, pincodes }) });
