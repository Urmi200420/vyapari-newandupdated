import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { money } from "./data.js";
import { cartLines, totals, addItem } from "./store.js";
import { Heading, Empty, Summary } from "./shared.jsx";
import { AddressBook } from "./Account.jsx";
export function Cart({ state, update, notify }) {
  const items = cartLines(state.cart);
  if (!items.length)
    return (
      <Empty title="Your cart is waiting">
        A little everyday joy is just a browse away.
      </Empty>
    );
  return (
    <>
      <Heading eyebrow="Made for your everyday">Your shopping bag.</Heading>
      <div className="cu-split">
        <section className="cu-panel">
          {items.map((p) => (
            <div className="cu-line" key={p.id}>
              <Link to={`/customer/product/${p.id}`}>
                <img src={p.image} alt={p.name} />
              </Link>
              <div>
                <Link to={`/customer/product/${p.id}`}>
                  <h3>{p.name}</h3>
                </Link>
                <p>{money(p.price)} each</p>
                <div className="cu-actions">
                  <Button
                    aria-label={`Decrease ${p.name}`}
                    disabled={p.quantity === 1}
                    onClick={() =>
                      update((s) => ({
                        ...s,
                        cart: s.cart.map((c) =>
                          c.id === p.id
                            ? { ...c, quantity: c.quantity - 1 }
                            : c,
                        ),
                      }))
                    }
                  >
                    −
                  </Button>
                  <span aria-label="Quantity">{p.quantity}</span>
                  <Button
                    aria-label={`Increase ${p.name}`}
                    disabled={p.quantity >= p.stock}
                    onClick={() => update((s) => addItem(s, p.id))}
                  >
                    +
                  </Button>
                  <Button
                    onClick={() => {
                      update((s) => ({
                        ...s,
                        cart: s.cart.filter((c) => c.id !== p.id),
                      }));
                      notify("Product removed from cart.");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <b>{money(p.price * p.quantity)}</b>
            </div>
          ))}
          <Button to="/customer/shop">Continue Shopping</Button>
        </section>
        <Summary items={items}>
          <Button to="/customer/checkout" block variant="solid">
            Proceed to Checkout
          </Button>
        </Summary>
      </div>
    </>
  );
}

export function Checkout({ state, update, notify, submit }) {
  const [selected, select] = useState(state.addresses[0]?.id || "");
  const [review, setReview] = useState(false);
  const items = cartLines(state.cart);
  useEffect(() => setReview(false), [state.cart, state.addresses, selected]);
  if (!items.length)
    return (
      <Empty title="Your cart is empty">
        Add some products before checking out.
      </Empty>
    );
  return (
    <>
      <Heading eyebrow="One last step">
        {review ? "Review your order." : "Checkout, made simple."}
      </Heading>
      <div className="cu-split">
        <div className="cu-stack">
          <AddressBook {...{ state, update, selected, select, notify }} />
          <section className="cu-panel">
            <h2>Cash on Delivery</h2>
            <p>
              Pay {money(totals(items).total)} in cash when your order arrives.
              No online payment is required.
            </p>
          </section>
          <section className="cu-panel">
            <h2>Review your products</h2>
            {items.map((p) => (
              <div className="cu-between cu-review" key={p.id}>
                <span>
                  {p.name} × {p.quantity}
                </span>
                <b>{money(p.price * p.quantity)}</b>
              </div>
            ))}
            {review && (
              <p>
                Delivery to{" "}
                <b>{state.addresses.find((a) => a.id === selected)?.name}</b>.
                Check the shipping address and amount before placing your order.
              </p>
            )}
          </section>
        </div>
        <Summary items={items}>
          {review ? (
            <>
              <Button variant="solid" block onClick={() => submit(selected)}>
                Place Order
              </Button>
              <Button block onClick={() => setReview(false)}>
                Back to checkout
              </Button>
            </>
          ) : (
            <Button
              variant="solid"
              block
              disabled={!state.addresses.some((a) => a.id === selected)}
              onClick={() => setReview(true)}
            >
              Review order
            </Button>
          )}
        </Summary>
      </div>
    </>
  );
}
