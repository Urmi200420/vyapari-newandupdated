import { products as base, categories } from "../data.js";
export { categories };
export const sellers = [
  {
    id: "local",
    name: "Green Basket Market",
    location: "Bengaluru, Karnataka",
    rating: 4.8,
  },
  {
    id: "daily",
    name: "Everyday Essentials",
    location: "Mumbai, Maharashtra",
    rating: 4.6,
  },
];
const pictures = {
  veggies: "groceries",
  electronics: "gadgets",
  clothing: "fashion",
  footwear: "fashion",
  home: "groceries",
  books: "books",
  beauty: "beauty",
  sports: "gadgets",
  toys: "books",
};
export const products = base.map((p, i) => ({
  ...p,
  stock: i === 7 ? 0 : 8 + i,
  sellerId: i % 2 ? "daily" : "local",
  image: `/vibes/${pictures[p.category]}.jpg`,
  description: `${p.name}, carefully selected for everyday quality and value. Sold by independent Vyapari merchants, with convenient doorstep delivery.`,
  specifications: {
    Brand: i % 2 ? "Everyday" : "Green Basket",
    Category: categories.find((c) => c.id === p.category).label,
    Condition: "New",
    "Package contents": p.name,
  },
  reviews: [
    {
      name: "Priya S.",
      rating: 5,
      date: "2026-10-12",
      comment: "Good quality and carefully packed. Exactly as described.",
    },
    {
      name: "Arjun K.",
      rating: 4,
      date: "2026-10-18",
      comment: "Great value. Delivery arrived within the expected time.",
    },
  ],
}));
export const stages = [
  "Order Placed",
  "Processing",
  "Dispatched",
  "Out for Delivery",
  "Delivered",
];
export const initialAddress = {
  id: "home",
  label: "Home",
  name: "Aanya Sharma",
  phone: "9876543210",
  house: "24, Garden Apartments",
  street: "Indiranagar",
  city: "Bengaluru",
  state: "Karnataka",
  pin: "560038",
};
export const initialProfile = {
  name: "Aanya Sharma",
  email: "aanya@example.com",
  phone: "9876543210",
  updates: true,
};
export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const delivery = (subtotal) =>
  subtotal === 0 || subtotal >= 999 ? 0 : 49;
export const seedOrders = stages.map((status, i) => {
  const p = products[i + 12];
  return {
    id: `VYP-DEMO-100${i}`,
    date: new Date(2026, 9, 25 - i).toISOString(),
    status,
    items: [{ ...p, quantity: 1 }],
    address: { ...initialAddress },
    subtotal: p.price,
    delivery: delivery(p.price),
    total: p.price + delivery(p.price),
    payment: "Cash on Delivery",
    demo: true,
  };
});
