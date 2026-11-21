// Seller shop profile. With the real backend (VITE_REAL_AUTH=true) it reads and saves the seller's own data;
// otherwise it uses the demo data as before.
import * as demo from "./index.js";

const REAL = import.meta.env.VITE_REAL_AUTH === "true";

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw new Error("Could not reach the server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please log in again.");
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const getProfile = () => (REAL ? call("/api/seller/profile") : demo.getProfile());
export const saveProfile = (profile) =>
  REAL ? call("/api/seller/profile", { method: "PUT", body: JSON.stringify(profile) }) : demo.saveProfile(profile);