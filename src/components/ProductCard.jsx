import { useNavigate } from "react-router-dom";
import { formatPrice } from "../data.js";

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  // Guests can look but need an account to buy
  const requireLogin = () => navigate("/customer/shop");

  const sellingPrice = product.price;
  const mrp = product.mrp || Math.round(sellingPrice * 1.35);
  const discount = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

  return (
    <article className="card">
      {/* phone-frame look, like the mockups in the inspo */}
      <div className="phone">
        <div className="phone-screen">{product.emoji}</div>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>

        {/* Pricing & Discount breakdown */}
        <div className="price-block">
          <strong className="price-selling">{formatPrice(sellingPrice)}</strong>
          {mrp > sellingPrice && (
            <>
              <del className="price-mrp">{formatPrice(mrp)}</del>
              <span className="discount-tag">({discount}% OFF)</span>
            </>
          )}
        </div>

        <div className="meta">
          <span className="rating">
            <span className="stars">★</span> {product.rating.toFixed(1)}
          </span>
        </div>

        <button className="btn btn-solid block" onClick={requireLogin}>
          Add to cart
        </button>
      </div>
    </article>
  );
}
