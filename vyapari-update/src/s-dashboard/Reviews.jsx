import { useState } from "react";
import { getReviews } from "../api";
import GlassButton from "../components/GlassButton.jsx";
import { useAsync, Loading, ErrorNote, Stars, fmtDate } from "./parts.jsx";

const PAGE = 8;

export default function Reviews() {
  const { data, error, reload } = useAsync(getReviews);
  const [product, setProduct] = useState("all");
  const [stars, setStars] = useState("all");
  const [shown, setShown] = useState(PAGE);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading text="Loading reviews..." />;
  if (data.length === 0) return <p className="dash-note">No reviews yet. They show up here once buyers rate your products.</p>;

  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: data.filter((r) => r.rating === n).length }));

  // average per product, lowest first so problem products are easy to spot
  const per = {};
  data.forEach((r) => {
    per[r.itemName] = per[r.itemName] || { name: r.itemName, total: 0, count: 0 };
    per[r.itemName].total += r.rating;
    per[r.itemName].count += 1;
  });
  const perList = Object.values(per)
    .map((p) => ({ ...p, avg: p.total / p.count }))
    .sort((a, b) => a.avg - b.avg);

  const rows = data.filter((r) => (product === "all" || r.itemName === product) && (stars === "all" || r.rating === Number(stars)));

  return (
    <div className="dash-stack">
      <div className="two-col">
        <section className="panel">
          <h2 className="stack-title small">
            <em>What buyers think</em>
            <strong>Overall rating</strong>
          </h2>
          <div className="rating-hero">
            <b className="stat-value">{avg.toFixed(1)}</b>
            <div>
              <Stars value={avg} />
              <p className="muted">{data.length} reviews</p>
            </div>
          </div>
          <div className="hbars">
            {dist.map((d) => (
              <div key={d.n} className="hbar">
                <div className="hbar-top">
                  <span>{d.n} ★</span>
                  <b>{d.count}</b>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: (d.count / data.length) * 100 + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="stack-title small">
            <em>Product by product</em>
            <strong>Ratings</strong>
          </h2>
          <div className="per-list" data-lenis-prevent>
            {perList.map((p) => (
              <div key={p.name} className="per-row">
                <span>{p.name}</span>
                <span className={p.avg < 3.5 ? "low-rate" : ""}>
                  <Stars value={p.avg} /> <b>{p.avg.toFixed(1)}</b> <span className="muted">({p.count})</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="stack-title small">
          <em>In their words</em>
          <strong>Customer feedback</strong>
        </h2>
        <div className="dash-row filters">
          <select className="select" value={product} onChange={(e) => { setProduct(e.target.value); setShown(PAGE); }} aria-label="Filter by product">
            <option value="all">All products</option>
            {perList.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
          <select className="select" value={stars} onChange={(e) => { setStars(e.target.value); setShown(PAGE); }} aria-label="Filter by rating">
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="dash-note">No reviews match.</p>
        ) : (
          <div className="review-list">
            {rows.slice(0, shown).map((r) => (
              <article key={r.id} className="review">
                <div className="dash-row between">
                  <Stars value={r.rating} />
                  <span className="muted">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="review-text">“{r.comment}”</p>
                <p className="muted">
                  {r.customer} on <b>{r.itemName}</b>
                </p>
              </article>
            ))}
          </div>
        )}
        {rows.length > shown && (
          <div className="dash-row center">
            <GlassButton onClick={() => setShown(shown + PAGE)}>Show more ({rows.length - shown} left)</GlassButton>
          </div>
        )}
      </section>
    </div>
  );
}