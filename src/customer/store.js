import {
  products,
  initialAddress,
  initialProfile,
  seedOrders,
  delivery,
} from "./data.js";
export const newId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Array.from(globalThis.crypto?.getRandomValues?.(new Uint32Array(2)) || [Math.random() * 1e9, Math.random() * 1e9], (n) => Math.floor(n).toString(36)).join("")}`;
export const storageKey = "vyapari_customer_v1";
export const freshState = () => ({
  mode: "guest",
  profile: { ...initialProfile },
  addresses: [{ ...initialAddress }],
  cart: [],
  orders: seedOrders,
  viewed: [],
});
export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (
      saved &&
      ["guest", "registered"].includes(saved.mode) &&
      ["cart", "orders", "addresses", "viewed"].every((k) =>
        Array.isArray(saved[k]),
      ) &&
      saved.profile
    )
      return saved;
  } catch {}
  return freshState();
}
export function cartLines(cart) {
  return cart
    .map((line) => ({
      ...products.find((p) => p.id === line.id),
      quantity: line.quantity,
    }))
    .filter((p) => p.id && Number.isInteger(p.quantity) && p.quantity > 0);
}
export function totals(items) {
  const subtotal = items.reduce((sum, p) => sum + p.price * p.quantity, 0);
  return {
    subtotal,
    delivery: delivery(subtotal),
    total: subtotal + delivery(subtotal),
  };
}
export function addItem(state, id, amount = 1) {
  if (state.mode !== "registered")
    throw Error("Please switch to Registered User demo mode to shop.");
  const p = products.find((p) => p.id === id);
  const current = state.cart.find((c) => c.id === id)?.quantity || 0;
  if (
    !p ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    current + amount > p.stock
  )
    throw Error("Requested quantity exceeds available stock.");
  return {
    ...state,
    cart: [
      ...state.cart.filter((c) => c.id !== id),
      { id, quantity: current + amount },
    ],
  };
}
export function placeOrder(state, addressId) {
  if (state.mode !== "registered")
    throw Error("Registered demo mode is required.");
  const items = cartLines(state.cart);
  const address = state.addresses.find((a) => a.id === addressId);
  if (!items.length || !address)
    throw Error("Add products and select a shipping address.");
  if (items.some((p) => p.quantity > p.stock))
    throw Error("Some quantities exceed available stock.");
  const order = {
    id: `VYP-${newId()}`,
    date: new Date().toISOString(),
    status: "Order Placed",
    items,
    address: { ...address },
    ...totals(items),
    payment: "Cash on Delivery",
  };
  return {
    state: { ...state, cart: [], orders: [order, ...state.orders] },
    order,
  };
}
