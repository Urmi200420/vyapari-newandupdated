import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { products, categories } from "./data.js";
import { placeOrder, BYPASS_LOGIN } from "./store.js";
import { useCustomer } from "./CustomerContext.jsx";
import { Complaints, ComplaintDetails } from "./Complaints.jsx";
import { Heading, Empty } from "./shared.jsx";
import { Shop, ProductDetails } from "./Catalog.jsx";
import { Cart, Checkout } from "./Shopping.jsx";
import { Profile } from "./Account.jsx";
import { OrderList, OrderDetails } from "./Orders.jsx";
import { Overview } from "./Overview.jsx";
import { Info } from "./Info.jsx";
import "./customer.css";
const paths = [
  ["", "Dashboard"],
  ["shop", "Shop"],
  ["categories", "Categories"],
  ["cart", "Cart"],
  ["orders", "My Orders"],
  ["history", "Order History"],
  ["profile", "Profile"],
  ["complaints", "My Complaints"],
  ["about", "About Us"],
  ["contact", "Contact Us"],
  ["faq", "FAQs"],
  ["policies", "Customer Policies"],
];
export default function Customer() {
  const {
    state,
    update: setState,
    add,
    notify,
    storageError,
    requestDemo,
  } = useCustomer();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const lock = useRef(false);
  useEffect(() => {
    setMenu(false);
    lock.current = false;
  }, [location.pathname]);
  const registered = state.mode === "registered";
  const view = (id) =>
    setState((s) => ({
      ...s,
      viewed: [id, ...s.viewed.filter((i) => i !== id)].slice(0, 8),
    }));
  const submit = (addressId) => {
    if (lock.current) return;
    try {
      lock.current = true;
      const result = placeOrder(state, addressId);
      setState(result.state);
      navigate(`/customer/success/${result.order.id}`, { replace: true });
      notify("Your demo order has been placed.");
    } catch (e) {
      lock.current = false;
      notify(e.message);
    }
  };
  const guard = (element) =>
    registered ? (
      element
    ) : (
      <section className="cu-panel cu-empty">
        <h2>Your customer space awaits.</h2>
        <p>
          Switch to Registered User demo mode to access shopping and account
          features.
        </p>
        <Button variant="solid" onClick={() => requestDemo()}>
          Login / Signup demo
        </Button>
      </section>
    );
  return (
    <div className="cu-shell">
      <aside className={`cu-sidebar glass-panel ${menu ? "cu-open" : ""}`}>
        <div className="cu-between">
          <Link className="logo" to="/">
            Vyapari
          </Link>
          <button
            className="cu-close"
            onClick={() => setMenu(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <p className="cu-muted">Your everyday marketplace</p>
        <nav aria-label="Customer navigation">
          {paths.map(([path, label]) => (
            <NavLink end key={path} to={`/customer${path ? `/${path}` : ""}`}>
              {label}
              {path === "cart" && registered
                ? ` (${state.cart.reduce((n, c) => n + c.quantity, 0)})`
                : ""}
            </NavLink>
          ))}
        </nav>
        <div className="cu-side-foot">
          <p className="cu-muted">Frontend demo · No real purchases</p>
          <Button to="/">Back to homepage</Button>
          {registered && !BYPASS_LOGIN && (
            <Button
              onClick={() => {
                setState((s) => ({ ...s, mode: "guest" }));
                navigate("/customer");
                notify("Switched to Guest mode.");
              }}
            >
              Logout
            </Button>
          )}
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation"
          className="cu-scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <main className="cu-main">
        <header className="cu-topbar glass-panel">
          <button
            className="cu-menu btn glass"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span>Customer {registered ? "dashboard" : "store"}</span>
          {!BYPASS_LOGIN && (
            <label className="cu-mode">
              Demo mode
              <select
                aria-label="Demo mode"
                value={state.mode}
                onChange={(e) =>
                  setState((s) => ({ ...s, mode: e.target.value }))
                }
              >
                <option value="guest">Guest</option>
                <option value="registered">Registered User</option>
              </select>
            </label>
          )}
          <Link
            to="/customer/cart"
            className="btn glass"
            style={{ marginLeft: "auto" }}
          >
            Cart (
            {registered ? state.cart.reduce((n, c) => n + c.quantity, 0) : 0})
          </Link>
        </header>
        {storageError && (
          <p role="alert" className="cu-panel">
            Browser storage is unavailable. Changes will last only for this
            visit.
          </p>
        )}
        <Routes>
          <Route index element={<Overview state={state} add={add} />} />
          <Route
            path="dashboard"
            element={<Overview state={state} add={add} />}
          />
          <Route path="shop" element={<Shop add={add} />} />
          <Route
            path="categories"
            element={
              <>
                <Heading eyebrow="Something for every day">
                  Explore the categories.
                </Heading>
                <div className="cu-categories">
                  {categories.slice(1).map((c) => (
                    <Link
                      className="cu-panel"
                      key={c.id}
                      to={`/customer/shop?category=${c.id}`}
                    >
                      <h2>{c.label}</h2>
                      <p>
                        {products.filter((p) => p.category === c.id).length}{" "}
                        products →
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            }
          />
          <Route
            path="product/:id"
            element={<ProductDetails add={add} view={view} />}
          />
          <Route
            path="cart"
            element={guard(
              <Cart state={state} update={setState} notify={notify} />,
            )}
          />
          <Route
            path="checkout"
            element={guard(
              <Checkout
                state={state}
                update={setState}
                notify={notify}
                submit={submit}
              />,
            )}
          />
          <Route
            path="orders"
            element={guard(<OrderList state={state} active />)}
          />
          <Route path="history" element={guard(<OrderList state={state} />)} />
          <Route
            path="order/:id"
            element={guard(<OrderDetails state={state} />)}
          />
          <Route
            path="success/:id"
            element={guard(<OrderDetails state={state} success />)}
          />
          <Route
            path="profile"
            element={guard(
              <Profile state={state} update={setState} notify={notify} />,
            )}
          />
          <Route path="complaints" element={guard(<Complaints />)} />
          <Route path="complaints/:id" element={guard(<ComplaintDetails />)} />
          {["about", "contact", "faq", "policies"].map((page) => (
            <Route
              key={page}
              path={page}
              element={<Info page={page} notify={notify} />}
            />
          ))}
          <Route path="*" element={<Empty title="Page not found" />} />
        </Routes>
        <footer className="cu-footer">
          <Link to="/">Vyapari</Link>
          <span>Everyday essentials. Independent sellers.</span>
          <Link to="/customer/faq">FAQs</Link>
          <Link to="/customer/policies">Policies</Link>
        </footer>
      </main>
    </div>
  );
}
