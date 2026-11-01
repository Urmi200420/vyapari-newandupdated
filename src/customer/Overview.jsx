import { Link } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { products, categories, money } from "./data.js";
import { ProductCard } from "./shared.jsx";
export function Overview({ state, add }) {
  const recent = state.viewed
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  return (
    <>
      <section className="cu-welcome glass-panel">
        <div>
          <p className="eyebrow">Your everyday, a little better</p>
          <h1>
            {state.mode === "guest"
              ? "A world of good finds."
              : `Welcome back, ${state.profile.name.split(" ")[0]}.`}
          </h1>
          <p>
            From fresh essentials to your next favourite thing.
            <br />
            Discover independent sellers, all in one place.
          </p>
          <div className="cu-actions">
            <Button to="/customer/shop" variant="solid">
              Explore the shop →
            </Button>
            {state.mode === "registered" && (
              <Button to="/customer/orders">Track an order</Button>
            )}
          </div>
        </div>
        <img src="/vibes/groceries.jpg" alt="Fresh everyday groceries" />
      </section>
      {state.mode === "registered" && (
        <>
          <div className="cu-stats">
            {[
              ["Total Orders", state.orders.length],
              [
                "Active Orders",
                state.orders.filter((o) => o.status !== "Delivered").length,
              ],
              [
                "Delivered Orders",
                state.orders.filter((o) => o.status === "Delivered").length,
              ],
            ].map(([label, n]) => (
              <Link
                className="cu-panel"
                key={label}
                to={
                  label === "Active Orders"
                    ? "/customer/orders"
                    : "/customer/history"
                }
              >
                <small>{label}</small>
                <strong>{n}</strong>
              </Link>
            ))}
          </div>
          <section className="cu-panel">
            <div className="cu-between">
              <h2>Recent orders</h2>
              <Link to="/customer/history">View all →</Link>
            </div>
            {state.orders.slice(0, 3).map((o) => (
              <Link
                className="cu-between cu-review"
                key={o.id}
                to={`/customer/order/${o.id}`}
              >
                <span>
                  {o.id}
                  <small>{o.items[0].name}</small>
                </span>
                <span>
                  {o.status} · {money(o.total)}
                </span>
              </Link>
            ))}
          </section>
        </>
      )}
      <div className="cu-between">
        <h2>Shop by category</h2>
        <Link to="/customer/categories">All categories →</Link>
      </div>
      <div className="cu-categories">
        {categories.slice(1, 6).map((c) => (
          <Link
            className="glass"
            to={`/customer/shop?category=${c.id}`}
            key={c.id}
          >
            {c.label} →
          </Link>
        ))}
      </div>
      {recent.length > 0 && (
        <>
          <h2>Recently viewed</h2>
          <div className="cu-grid">
            {recent.slice(0, 4).map((p) => (
              <ProductCard {...{ p, add }} key={p.id} />
            ))}
          </div>
        </>
      )}
      <div className="cu-between">
        <h2>Picked for your everyday</h2>
        <Link to="/customer/shop">Browse all →</Link>
      </div>
      <div className="cu-grid">
        {[products[0], products[8], products[18], products[16]].map((p) => (
          <ProductCard {...{ p, add }} key={p.id} />
        ))}
      </div>
    </>
  );
}
