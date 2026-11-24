// Seller products (Inventory page). With the real backend (VITE_REAL_AUTH=true) every call goes to the
// logged-in seller's own catalog; otherwise it uses the demo data as before.
import * as demo from "./index.js";

const REAL = import.meta.env.VITE_REAL_AUTH === "true";

async function read(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Please log in again.");
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...options });
  } catch {
    throw new Error("Could not reach the server");
  }
  return read(res);
}

// product details as JSON + the picture as a file, in one request
async function send(path, method, fields, file) {
  const body = new FormData();
  body.append("data", new Blob([JSON.stringify(fields)], { type: "application/json" }));
  if (file) body.append("image", file);
  let res;
  try {
    res = await fetch(path, { method, body, credentials: "include" }); // the browser sets the multipart header itself
  } catch {
    throw new Error("Could not reach the server");
  }
  return read(res);
}

export const getItems = () => (REAL ? call("/api/seller/items") : demo.getItems());

export const addItem = (fields, file) => (REAL ? send("/api/seller/items", "POST", fields, file) : demo.addItem(fields, file));

export const updateItem = (id, changes, file) => {
  if (!REAL) return demo.updateItem(id, changes, file);
  return file
    ? send(`/api/seller/items/${id}`, "PUT", changes, file)
    : call(`/api/seller/items/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
};

export const deleteItem = (id) => (REAL ? call(`/api/seller/items/${id}`, { method: "DELETE" }) : demo.deleteItem(id));
