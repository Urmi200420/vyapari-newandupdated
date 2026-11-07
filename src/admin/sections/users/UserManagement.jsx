import { useAdmin } from "../../AdminContext.jsx";
import { Seg, presence } from "../../ui.jsx";
import CustomerList from "./CustomerList.jsx";
import SellerList from "./SellerList.jsx";
import DeliveryList from "./DeliveryList.jsx";

const TABS = [
  { id: "customers", icon: "🛒", label: "Customers", Page: CustomerList, list: "customers", dash: "Customer Dashboard" },
  { id: "sellers", icon: "🏪", label: "Sellers", Page: SellerList, list: "sellers", dash: "Seller Dashboard" },
  { id: "delivery", icon: "🛵", label: "Delivery personnel", Page: DeliveryList, list: "delivery", dash: "Delivery Dashboard" },
];

// account is usable right now
export const isActiveAccount = (type, x) => (type === "sellers" ? x.status === "ACTIVE" : x.status === "ACTIVE");

export default function UserManagement({ view, setView }) {
  const { db } = useAdmin();
  const tab = TABS.find((t) => t.id === view) || TABS[0];
  const now = Date.now();

  return (
    <div className="dash-stack ad-stack">
      <div className="ad-user-summary">
        {TABS.map((t) => {
          const list = db[t.list];
          const active = list.filter((x) => isActiveAccount(t.list, x)).length;
          const online = list.filter((x) => isActiveAccount(t.list, x) && presence(x.lastActiveAt, now).key === "online").length;
          return (
            <button key={t.id} type="button" className={"panel ad-user-card" + (tab.id === t.id ? " on" : "")} onClick={() => setView(t.id)}>
              <span className="ad-user-icon">{t.icon}</span>
              <div>
                <span className="eyebrow">{t.dash}</span>
                <b className="stat-value">{list.length}</b>
                <span className="stat-note">
                  registered · <span className="up">{active} active</span> · <span className="ad-live-text">{online} online</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="dash-row between">
        <Seg label="User lists" value={tab.id} onChange={setView} options={TABS.map((t) => ({ id: t.id, icon: t.icon, label: t.label, count: db[t.list].length }))} />
        <p className="dash-note left ad-small">Online / last-seen states are demo values from sample data, not live session tracking.</p>
      </div>

      <tab.Page key={tab.id} />
    </div>
  );
}
