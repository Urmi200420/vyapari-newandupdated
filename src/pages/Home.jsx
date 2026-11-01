import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import GlassButton from "../components/GlassButton.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { categories, products } from "../data.js";
import { scrollToElement } from "../smoothScroll.js";

// If an image file is missing, hide the broken icon and show the label instead
const hideBroken = (e) => {
  e.currentTarget.style.display = "none";
};

// "Shop by vibe" cards: picture in public/vibes/, and which category it opens
const vibes = [
  { img: "/vibes/groceries.jpg", label: "Restock your pantry", cat: "veggies" },
  { img: "/vibes/fashion.jpg", label: "build our style!", cat: "clothing" },
  { img: "/vibes/books.jpg", label: "Wanna read books?", cat: "books" },
  { img: "/vibes/gadgets.jpg", label: "check out cool tech", cat: "electronics" },
  { img: "/vibes/beauty.jpg", label: "skincare?", cat: "beauty" }
];


export default function Home() {
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false); // phone: sidebar sheet open
  const [collapsed, setCollapsed] = useState(false); // desktop: sidebar hidden with the ✕
  const [scrolledUp, setScrolledUp] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      // When scrolling down past 60px, scroll the search bar up out of view
      if (y > 60 && y > lastScrollY.current) {
        setScrolledUp(true);
      } else if (y < lastScrollY.current || y <= 30) {
        // When scrolling up or near the top, bring the search bar back down
        setScrolledUp(false);
      }
      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const counts = useMemo(() => {
    const c = { all: products.length };
    products.forEach((p) => (c[p.category] = (c[p.category] || 0) + 1));
    return c;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (active === "all" || p.category === active) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [active, query]);

  const activeLabel = categories.find((c) => c.id === active)?.label;
  const circleCats = categories.filter((c) => c.id !== "all");

  // "Shop by vibe" row: the arrows glide it sideways
  const vibeRef = useRef(null);
  const slideVibes = (dir) => {
    const row = vibeRef.current;
    if (row) row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: "smooth" });
  };

  const jumpToShop = () => scrollToElement(document.getElementById("shop"));
  const pickCategory = (id) => {
    setActive(id);
    jumpToShop();
  };

  // ✕ button: closes the sheet on phones, hides the sidebar on desktop
  const pressCross = () => {
    setMenuOpen(false);
    if (window.innerWidth > 860) setCollapsed(true);
  };
  const openMenu = () => {
    setMenuOpen(true);
    setCollapsed(false);
  };

  return (
    <div className={"shell" + (collapsed ? " collapsed" : "")}>
      <Sidebar
        active={active}
        onSelect={pickCategory}
        counts={counts}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onCross={pressCross}
      />

      <main className="main">
        {/* floating glass top bar (scrollable up when scrolling down, slides back on scroll up) */}
        <header className={"topbar glass-panel home-topbar" + (scrolledUp ? " scrolled-up" : "")}>
          <button className="menu-btn glass" onClick={openMenu} aria-label="Open menu">
            ☰
          </button>
          <input
            className="search"
            type="search"
            placeholder="Search products, brands and more"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) jumpToShop();
            }}
          />
          <nav className="top-links">
            <Link to="/seller" className="text-link">
              Sell on Vyapari
            </Link>
            <GlassButton to="/login" variant="solid">
              Log in
            </GlassButton>
          </nav>
        </header>

        {/* hero tile */}
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Buy anything · Sell everything</p>
            <h1>
              <em>Everything you love </em>
              <strong>Vyapari</strong>
            </h1>
            <p className="hero-sub">
              Fresh produce, electronics, fashion and more from sellers you can trust. Look around freely and log in
              when you are ready.
            </p>
            <div className="hero-actions">
              <GlassButton variant="solid" onClick={jumpToShop}>
                Start browsing
              </GlassButton>
              <GlassButton to="/seller">Become a seller</GlassButton>
            </div>
            <div className="hero-stats">
              <div>
                <b>{products.length}+</b>
                <span>Items</span>
              </div>
              <div>
                <b>{categories.length - 1}</b>
                <span>Categories</span>
              </div>
              <div>
                <b>1</b>
                <span>Marketplace</span>
              </div>
            </div>
          </div>

          <div className="stage" aria-hidden="true">
            <div className="stage-phone">
              <div className="stage-tilt">
                <div className="phone">
                  <div className="phone-screen">
                    <span className="ph-label">screen.jpg</span>
                    <img src="/stage/screen.jpg" alt="" onError={hideBroken} />
                  </div>
                </div>
              </div>
            </div>

            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={"layer l" + n}>
                <div className="layer-card">
                  <span className="ph-label">{"layer" + n + ".jpg"}</span>
                  <img src={"/stage/layer" + n + ".jpg"} alt="" onError={hideBroken} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* shop by vibe tile */}
        <section className="vibes panel">
          <div className="vibes-head">
            <p className="eyebrow">Shop by vibe</p>
            <div className="vibe-arrows">
              <GlassButton className="arrow" onClick={() => slideVibes(-1)} aria-label="Scroll left">
                ←
              </GlassButton>
              <GlassButton className="arrow" onClick={() => slideVibes(1)} aria-label="Scroll right">
                →
              </GlassButton>
            </div>
          </div>
          <div className="vibe-row" ref={vibeRef}>
            {vibes.map((v) => (
              <button key={v.label} className="vibe" onClick={() => pickCategory(v.cat)}>
                <img src={v.img} alt="" loading="lazy" onError={hideBroken} />
                <span className="vibe-tag glass">{v.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* category circles tile */}
        <section className="circles panel">
          <p className="eyebrow">Browse by category</p>
          <div className="circle-row">
            {circleCats.map((c) => (
              <button
                key={c.id}
                className={"circle" + (active === c.id ? " on" : "")}
                onClick={() => pickCategory(c.id)}
              >
                <span className="circle-icon glass">{c.icon}</span>
                <span className="circle-name">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* products tile */}
        <section className="shop panel" id="shop">
          <div className="shop-head">
            <h2 className="stack-title">
              <em>Now showing</em>
              <strong>{activeLabel}</strong>
            </h2>
            <span className="pill">{visible.length} items</span>
          </div>

          {visible.length === 0 ? (
            <p className="empty">Nothing matches your search yet.</p>
          ) : (
            <div className="grid">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}