/*
  The brain of the help chat. No React in here.

  respond(text, ctx)  -> works out what the customer wants and returns the bot's next message:
      { text, chips: [{ label, action }], pick: { intent, orders }, form: { category, orderId } }
  ctx = { orders, name }      (orders come from the customer's state)

  askServer(text, ctx)  is the hook for a REAL AI later: with the Spring Boot backend running
  (VITE_USE_MOCK=false) the chat first asks POST /api/support/chat, which calls an AI model.
  The AI key stays on the server, never in this front end. If that call fails, the rules below answer.
*/
import { stages } from "./data.js";

export const CUSTOMER_CATEGORIES = [
  "Order not delivered or late",
  "Wrong or missing item",
  "Damaged or poor quality item",
  "Return or refund",
  "Cancel my order",
  "Payment or delivery charge",
  "Delivery partner behaviour",
  "Address or account",
  "Other",
];

const has = (t, ...words) => words.some((w) => t.includes(w));
export const shortId = (id) => (id.length > 16 ? id.slice(0, 8) + "…" + id.slice(-4) : id);
const when = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const stageText = {
  "Order Placed": "is confirmed and the seller is getting it ready.",
  Processing: "is being packed by the seller.",
  Dispatched: "has left the seller and is moving through our delivery network.",
  "Out for Delivery": "is out for delivery today. Your delivery partner is on the way. Please keep the cash ready, as this is Cash on Delivery.",
  Delivered: "was delivered.",
};
export const statusLine = (o) =>
  "Order " + shortId(o.id) + " (" + o.items.map((p) => p.name).join(", ") + ") " + (stageText[o.status] || "is " + o.status.toLowerCase() + ".") +
  (o.status === "Delivered" ? " Placed on " + when(o.date) + "." : "");

export const STARTERS = [
  { label: "📦 Track my order", action: { intent: "track" } },
  { label: "❌ Cancel an order", action: { intent: "cancel" } },
  { label: "↩️ Return or refund", action: { intent: "refund" } },
  { label: "💳 Payment & delivery charges", action: { intent: "payment" } },
  { label: "📍 Change my address", action: { intent: "address" } },
  { label: "🎧 Talk to support", action: { intent: "human" } },
];
const HELP_CHIPS = [
  { label: "📦 Track my order", action: { intent: "track" } },
  { label: "↩️ Return or refund", action: { intent: "refund" } },
  { label: "🎧 Talk to support", action: { intent: "human" } },
];

// words -> what the customer is asking for
export function detectIntent(text) {
  const t = text.toLowerCase();
  if (has(t, "human", "agent", "executive", "talk to", "speak to", "complaint", "complain", "ticket", "support team", "call me")) return "human";
  if (has(t, "cancel")) return "cancel";
  if (has(t, "refund", "return", "damage", "broken", "wrong item", "wrong product", "missing", "not as described", "defective", "replace", "exchange", "poor quality", "spoil", "rotten", "expired")) return "refund";
  if (has(t, "where", "track", "status", "late", "delay", "when will", "not received", "not delivered", "not arrived", "eta", "how long", "delivered but")) return "track";
  if (has(t, "address", "pincode", "location", "deliver to")) return "address";
  if (has(t, "pay", "cod", "cash", "upi", "card", "charge", "fee", "free delivery", "price", "bill", "money", "invoice")) return "payment";
  if (has(t, "thank", "thanks", "ok great", "got it", "that helps")) return "thanks";
  if (has(t, "bye", "goodbye")) return "bye";
  if (/^(hi|hello|hey|hii|namaste|good (morning|afternoon|evening))\b/.test(t)) return "greet";
  return "fallback";
}

const pick = (intent, text, orders) => ({
  text,
  pick: { intent, orders },
});

// the answer once we know which order the customer means
function aboutOrder(intent, o) {
  if (intent === "track")
    return {
      text: statusLine(o),
      chips: [
        ...(o.status === "Delivered" ? [{ label: "↩️ Problem with this order", action: { intent: "refund", orderId: o.id } }] : [{ label: "⏰ It's taking too long", action: { escalate: "Order not delivered or late", orderId: o.id } }]),
        { label: "🎧 Talk to support", action: { escalate: "Other", orderId: o.id } },
      ],
    };
  if (intent === "cancel")
    return {
      text: "Order " + shortId(o.id) + " has not been dispatched yet, so it can be cancelled for free. I'll send the request to our team and they'll confirm shortly.",
      chips: [{ label: "✅ Request cancellation", action: { escalate: "Cancel my order", orderId: o.id } }, { label: "No, keep my order", action: { intent: "thanks" } }],
    };
  // refund / return
  return {
    text:
      "I'm sorry about that. Eligible, unused products can be returned within 7 days of delivery (fresh produce and opened personal-care items are excluded). Refunds go back to you after the seller and our team review the case. What went wrong with " + shortId(o.id) + "?",
    chips: [
      { label: "Damaged or poor quality", action: { escalate: "Damaged or poor quality item", orderId: o.id } },
      { label: "Wrong or missing item", action: { escalate: "Wrong or missing item", orderId: o.id } },
      { label: "I want to return it", action: { escalate: "Return or refund", orderId: o.id } },
    ],
  };
}

export function respond(text, ctx, action = {}) {
  const orders = ctx.orders || [];
  const intent = action.intent || detectIntent(text);

  if (action.escalate) return { text: "Okay, let me pass this to our support team. Please check the details and add what happened.", form: { category: action.escalate, orderId: action.orderId || "" } };

  // an order was chosen from the list
  if (action.orderId) {
    const o = orders.find((x) => x.id === action.orderId);
    if (o) return aboutOrder(intent, o);
  }

  switch (intent) {
    case "track": {
      if (!orders.length) return { text: "You haven't placed an order yet, so there is nothing to track. Start shopping and I'll be here.", chips: HELP_CHIPS.slice(2) };
      const active = orders.filter((o) => o.status !== "Delivered");
      const list = active.length ? active : orders.slice(0, 3);
      if (list.length === 1) return aboutOrder("track", list[0]);
      return pick("track", active.length ? "You have " + active.length + " order(s) on the way. Which one?" : "All your orders are delivered. Which one do you mean?", list.slice(0, 5));
    }
    case "cancel": {
      const open = orders.filter((o) => ["Order Placed", "Processing"].includes(o.status));
      if (!open.length)
        return {
          text: "Orders that are already dispatched or out for delivery can't be cancelled. If it's still on the way, you can refuse it at the door, or request a return after delivery.",
          chips: [{ label: "📦 Track my order", action: { intent: "track" } }, { label: "🎧 Talk to support", action: { intent: "human" } }],
        };
      if (open.length === 1) return aboutOrder("cancel", open[0]);
      return pick("cancel", "Which order do you want to cancel?", open.slice(0, 5));
    }
    case "refund": {
      const done = orders.filter((o) => o.status === "Delivered");
      if (!done.length)
        return {
          text: "Returns and refunds start once an order is delivered. Your orders are still on the way. If something looks wrong already, our team can help.",
          chips: [{ label: "📦 Track my order", action: { intent: "track" } }, { label: "🎧 Talk to support", action: { intent: "human" } }],
        };
      if (done.length === 1) return aboutOrder("refund", done[0]);
      return pick("refund", "Sorry to hear that. Which delivered order has the problem?", done.slice(0, 5));
    }
    case "payment":
      return {
        text: "Vyapari is Cash on Delivery only: pay the amount shown in cash when your order arrives, so there's nothing to pay online. Delivery costs ₹49 on orders below ₹999 and is free from ₹999.",
        chips: [{ label: "Something is wrong with a charge", action: { escalate: "Payment or delivery charge" } }, { label: "📦 Track my order", action: { intent: "track" } }],
      };
    case "address":
      return {
        text: "You can add, edit or delete addresses any time from your Profile page. For an order that is not dispatched yet, I can ask the team to change its delivery address.",
        chips: [{ label: "Change address on an order", action: { escalate: "Address or account" } }, { label: "🎧 Talk to support", action: { intent: "human" } }],
      };
    case "human":
      return { text: "Sure, I'll connect you with our support team. Tell them what's wrong and they'll reply here under My tickets.", form: { category: "Other", orderId: "" } };
    case "thanks":
      return { text: "Happy to help! Anything else?", chips: HELP_CHIPS };
    case "bye":
      return { text: "Take care! I'm here whenever you need me. 👋" };
    case "greet":
      return { text: "Hi" + (ctx.name ? " " + ctx.name.split(" ")[0] : "") + "! What can I help you with?", chips: STARTERS };
    default:
      return {
        text: "I'm not sure I understood that. You can pick one of these, or I can bring in a person from our team.",
        chips: STARTERS,
        fallback: true,
      };
  }
}

// REAL AI (later). Expected reply: { reply: "text", suggestions: ["Track my order"], escalate: false }
export async function askServer(text, ctx) {
  if (import.meta.env.VITE_USE_MOCK !== "false") return null;
  try {
    const res = await fetch("/api/support/chat", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, orders: (ctx.orders || []).slice(0, 5).map((o) => ({ id: o.id, status: o.status })) }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j.reply) return null;
    return {
      text: j.reply,
      chips: [...(j.suggestions || []).map((s) => ({ label: s, action: { text: s } })), { label: "🎧 Talk to support", action: { intent: "human" } }],
      ...(j.escalate ? { form: { category: "Other", orderId: "" } } : {}),
    };
  } catch {
    return null;
  }
}