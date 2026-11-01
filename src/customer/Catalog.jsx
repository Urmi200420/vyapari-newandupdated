import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { products, categories, sellers, money } from "./data.js";
import { Heading, Empty, ProductCard, ProductImage } from "./shared.jsx";
import { filterProducts } from "./filters.js";
export function Shop({ add }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = new URLSearchParams(location.search).get("category") || "all";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initial);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("featured");
  const [minBadInput, setMinBadInput] = useState(false);
  const [maxBadInput, setMaxBadInput] = useState(false);
  useEffect(() => setCategory(initial), [initial]);
  const { list, errors, valid } = filterProducts(products, {
    query,
    category,
    min,
    max,
    sort,
    minBadInput,
    maxBadInput,
  });
  return (
    <>
      <Heading eyebrow="Your everyday marketplace">
        Find your next favourite.
      </Heading>
      <section className="cu-panel cu-filters">
        <label>
          Search products
          <input
            type="search"
            placeholder="What are you looking for?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min price
          <input
            type="number"
            min="0"
            step="any"
            aria-invalid={Boolean(errors.min || errors.range)}
            aria-describedby={!valid ? "price-filter-error" : undefined}
            value={min}
            onChange={(e) => {
              setMin(e.target.value);
              setMinBadInput(e.target.validity.badInput);
            }}
          />
        </label>
        <label>
          Max price
          <input
            type="number"
            min="0"
            step="any"
            aria-invalid={Boolean(errors.max || errors.range)}
            aria-describedby={!valid ? "price-filter-error" : undefined}
            value={max}
            onChange={(e) => {
              setMax(e.target.value);
              setMaxBadInput(e.target.validity.badInput);
            }}
          />
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </label>
        <Button
          onClick={() => {
            setQuery("");
            setCategory("all");
            setMin("");
            setMax("");
            setSort("featured");
            setMinBadInput(false);
            setMaxBadInput(false);
            navigate(location.pathname, { replace: true });
          }}
        >
          Reset filters
        </Button>
      </section>
      {!valid ? (
        <p id="price-filter-error" role="alert">
          {errors.range || errors.min || errors.max} Correct the price filters
          to view matching products.
        </p>
      ) : (
        <p className="cu-muted" role="status" aria-live="polite">
          {list.length} {list.length === 1 ? "product" : "products"} · Free
          delivery from ₹999
        </p>
      )}
      <div className="cu-grid">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} add={add} />
        ))}
      </div>
      {valid && !list.length && (
        <Empty title="No matches yet">
          Try another search or reset your filters.
        </Empty>
      )}
    </>
  );
}

export function ProductDetails({ add, view }) {
  const { id } = useParams();
  const p = products.find((p) => p.id === Number(id));
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  useEffect(() => {
    if (p) view(p.id);
    setQuantity(1);
  }, [id]);
  if (!p) return <Empty title="Product not found" />;
  const seller = sellers.find((s) => s.id === p.sellerId);
  return (
    <>
      <Link to="/customer/shop">← Back to shop</Link>
      <div className="cu-split cu-detail">
        <ProductImage p={p} />
        <section className="cu-panel">
          <Heading eyebrow={categories.find((c) => c.id === p.category)?.label}>
            {p.name}
          </Heading>
          <p>{p.description}</p>
          <h2>
            {money(p.price)} <s>{money(p.mrp)}</s>
          </h2>
          <p>
            ★ {p.rating} · {p.reviews.length} customer reviews
          </p>
          <p>{p.stock ? `In stock · ${p.stock} available` : "Out of stock"}</p>
          <label>
            Quantity
            <input
              aria-label="Product quantity"
              type="number"
              min="1"
              max={p.stock || 1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <div className="cu-actions">
            <Button
              variant="solid"
              disabled={!p.stock}
              onClick={() => add(p.id, quantity)}
            >
              Add to Cart
            </Button>
            <Button
              disabled={!p.stock}
              onClick={() => {
                if (add(p.id, quantity)) navigate("/customer/checkout");
              }}
            >
              Buy Now
            </Button>
          </div>
          <h3>Sold by {seller.name}</h3>
          <p>
            {seller.location} · ★ {seller.rating}
          </p>
        </section>
      </div>
      <div className="cu-split">
        <section className="cu-panel">
          <h2>Product specifications</h2>
          <dl>
            {Object.entries(p.specifications).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="cu-panel">
          <h2>Customer reviews</h2>
          {p.reviews.map((r) => (
            <article className="cu-review" key={r.name}>
              <b>
                {r.name} · {"★".repeat(r.rating)}
              </b>
              <time dateTime={r.date}>{r.date}</time>
              <p>{r.comment}</p>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
