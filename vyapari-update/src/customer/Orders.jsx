import { useParams } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { stages, money } from "./data.js";
import { Heading, Empty, Address } from "./shared.jsx";
export function OrderList({ state, active = false }) {
  const list = state.orders.filter((o) => !active || o.status !== "Delivered");
  return (
    <>
      <Heading eyebrow="Your Vyapari purchases">
        {active ? "On their way to you." : "Your order history."}
      </Heading>
      {!list.length && <Empty title="No orders yet" />}
      {list.map((o) => (
        <section className="cu-panel cu-order" key={o.id}>
          <div className="cu-between">
            <div>
              <h3>{o.id}</h3>
              <p>
                {new Date(o.date).toLocaleDateString("en-IN")}{" "}
                {o.demo && "· Sample order"}
              </p>
            </div>
            <span className="cu-badge">{o.status}</span>
          </div>
          <p>{o.items.map((p) => `${p.name} × ${p.quantity}`).join(", ")}</p>
          <div className="cu-between">
            <b>
              {money(o.total)} · {o.payment}
            </b>
            <Button to={`/customer/order/${o.id}`}>View & Track Order</Button>
          </div>
        </section>
      ))}
    </>
  );
}

export function OrderDetails({ state, success = false }) {
  const { id } = useParams();
  const o = state.orders.find((o) => o.id === id);
  if (!o) return <Empty title="Order not found" />;
  return (
    <>
      <Heading
        eyebrow={
          success ? "Thank you for shopping with us" : "Every step, right here"
        }
      >
        {success ? "Your order is placed." : "Track your order."}
      </Heading>
      <section className="cu-panel">
        <h2>{o.id}</h2>
        <p>
          {new Date(o.date).toLocaleString("en-IN")} ·{" "}
          {o.demo ? "Sample order" : "Demo purchase"}
        </p>
        <ol className="cu-timeline">
          {stages.map((s, i) => (
            <li key={s} className={i <= stages.indexOf(o.status) ? "done" : ""}>
              <span>{i <= stages.indexOf(o.status) ? "✓" : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p>
          Demonstration timeline: statuses are illustrative and do not update
          from a delivery service.
        </p>
      </section>
      <div className="cu-split">
        <section className="cu-panel">
          <h2>Purchased products</h2>
          {o.items.map((p) => (
            <div className="cu-line" key={p.id}>
              <img src={p.image} alt={p.name} />
              <div>
                <h3>{p.name}</h3>
                <p>
                  {money(p.price)} × {p.quantity}
                </p>
              </div>
              <b>{money(p.price * p.quantity)}</b>
            </div>
          ))}
        </section>
        <section className="cu-panel">
          <h2>Delivery address</h2>
          <b>{o.address.name}</b>
          <Address a={o.address} />
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(o.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{money(o.delivery)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{money(o.total)}</dd>
            </div>
          </dl>
          <p>
            Payment: <b>{o.payment}</b>
          </p>
          <Button to="/customer/orders">Active orders</Button>{" "}
          <Button to="/customer/history">Order history</Button>
        </section>
      </div>
    </>
  );
}
