import { Link } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { categories, money } from "./data.js";
import { totals } from "./store.js";
export function Heading({ eyebrow, children }) {
  return (
    <div className="cu-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{children}</h1>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <section className="cu-panel cu-empty">
      <h2>{title}</h2>
      <p>{children}</p>
      <Button to="/customer/shop" variant="solid">
        Explore the shop
      </Button>
    </section>
  );
}

export function ProductImage({ p }) {
  return (
    <div className="cu-photo">
      <img
        src={p.image}
        alt={`${categories.find((c) => c.id === p.category)?.label} collection`}
      />
      <span aria-label={p.name}>{p.emoji}</span>
    </div>
  );
}

export function ProductCard({ p, add }) {
  return (
    <article className="cu-product glass-panel">
      <Link to={`/customer/product/${p.id}`}>
        <ProductImage p={p} />
        <div className="cu-product-copy">
          <small>{categories.find((c) => c.id === p.category)?.label}</small>
          <h3>{p.name}</h3>
          <p>★ {p.rating.toFixed(1)} · 2 reviews</p>
        </div>
      </Link>
      <div className="cu-product-bottom">
        <div>
          <b>{money(p.price)}</b> <s>{money(p.mrp)}</s>
          <small>{p.stock ? `${p.stock} available` : "Out of stock"}</small>
        </div>
        <Button
          disabled={!p.stock}
          onClick={() => add(p.id)}
          aria-label={`Add ${p.name} to cart`}
        >
          Add +
        </Button>
      </div>
    </article>
  );
}

export function Summary({ items, children }) {
  const t = totals(items);
  return (
    <section className="cu-panel cu-summary">
      <h2>Order summary</h2>
      <dl>
        <div>
          <dt>Items subtotal</dt>
          <dd>{money(t.subtotal)}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{t.delivery ? money(t.delivery) : "Free"}</dd>
        </div>
        <div className="cu-total">
          <dt>Total payable</dt>
          <dd>{money(t.total)}</dd>
        </div>
      </dl>
      <p className="cu-muted">Free delivery on orders of ₹999 or more.</p>
      {children}
    </section>
  );
}

export function Address({ a }) {
  return (
    <p>
      {a.house}, {a.street}
      <br />
      {a.city}, {a.state} {a.pin}
      <br />
      {a.phone}
    </p>
  );
}
