import { useAdmin } from "../../AdminContext.jsx";
import { Seg, StatCard, num } from "../../ui.jsx";
import CustomerTickets from "./CustomerTickets.jsx";
import SellerTickets from "./SellerTickets.jsx";
import DeliveryTickets from "./DeliveryTickets.jsx";

const TABS = [
  { id: "customer", icon: "🛒", label: "Customer tickets", Page: CustomerTickets },
  { id: "seller", icon: "🏪", label: "Seller tickets", Page: SellerTickets },
  { id: "delivery", icon: "🛵", label: "Delivery tickets", Page: DeliveryTickets },
];

export default function TicketManagement({ view, setView }) {
  const { db } = useAdmin();
  const tab = TABS.find((t) => t.id === view) || TABS[0];
  const all = db.tickets;
  const open = all.filter((t) => t.status === "OPEN");
  const week = Date.now() - 7 * 864e5;
  const resolvedWeek = all.filter((t) => t.resolvedAt && Date.parse(t.resolvedAt) > week).length;

  return (
    <div className="dash-stack ad-stack">
      <div className="stat-grid">
        <StatCard icon="📥" label="Open tickets" value={num(open.length)} note={open.filter((t) => t.priority === "URGENT").length + " urgent · " + open.filter((t) => t.priority === "HIGH").length + " high"} tone={open.length ? "down" : "up"} />
        <StatCard icon="🛠️" label="In progress" value={num(all.filter((t) => t.status === "IN_PROGRESS").length)} note="Being worked on by support" />
        <StatCard icon="✅" label="Resolved · 7 days" value={num(resolvedWeek)} note={all.filter((t) => t.status === "RESOLVED").length + " resolved, " + all.filter((t) => t.status === "CLOSED").length + " closed overall"} tone="up" />
        <StatCard icon="🔗" label="From other dashboards" value={num(all.filter((t) => t.source === "live").length)} note="Raised on this browser in the customer, seller or delivery dashboard" />
      </div>

      <Seg
        label="Ticket categories"
        value={tab.id}
        onChange={setView}
        options={TABS.map((t) => ({ id: t.id, icon: t.icon, label: t.label, count: all.filter((x) => x.userType === t.id && (x.status === "OPEN" || x.status === "IN_PROGRESS")).length }))}
      />

      <tab.Page key={tab.id} />
    </div>
  );
}
