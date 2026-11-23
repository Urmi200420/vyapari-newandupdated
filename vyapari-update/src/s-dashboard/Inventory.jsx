import { useState } from "react";
import { getItems, addItem, updateItem, deleteItem } from "../api";
import { formatPrice } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";
import ItemForm, { CATS } from "./ItemForm.jsx";
import { useAsync, Loading, ErrorNote, Modal, isLow } from "./parts.jsx";

function Thumb({ item }) {
  return item.imageUrl ? (
    <img className={"thumb" + (item.active === false ? " faded" : "")} src={item.imageUrl} alt="" />
  ) : (
    <span className={"thumb emoji" + (item.active === false ? " faded" : "")}>{item.emoji || CATS.find((c) => c.id === item.category)?.icon || "📦"}</span>
  );
}

// the stock box: type an exact number (10 -> 50) and press Enter, or use − and +
function StockControl({ item, onSet }) {
  const [draft, setDraft] = useState(String(item.stock));
  const [prev, setPrev] = useState(item.stock);
  if (prev !== item.stock) {
    setPrev(item.stock);
    setDraft(String(item.stock));
  }
  const commit = () => {
    const n = Math.floor(Number(draft));
    if (!Number.isFinite(n) || n < 0) return setDraft(String(item.stock));
    if (n !== item.stock) onSet(n);
  };
  return (
    <div className={"stepper" + (isLow(item) ? " low" : "")}>
      <button type="button" onClick={() => onSet(Math.max(0, item.stock - 1))} aria-label="One less">
        −
      </button>
      <input
        value={draft}
        inputMode="numeric"
        aria-label={"Stock of " + item.name}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <button type="button" onClick={() => onSet(item.stock + 1)} aria-label="One more">
        +
      </button>
    </div>
  );
}

export default function Inventory() {
  const { data: items, error, loading, reload, setData } = useAsync(getItems);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [show, setShow] = useState("all"); // all | low | hidden
  const [confirmId, setConfirmId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState("");

  const patchLocal = (id, changes) => setData((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  // change something on a product: shows at once, and puts it back if the server refuses
  const change = async (item, changes) => {
    setActionError("");
    patchLocal(item.id, changes);
    try {
      await updateItem(item.id, changes);
    } catch (err) {
      patchLocal(item.id, item);
      setActionError(err.message || "Could not save that change");
    }
  };

  const remove = async (item) => {
    setActionError("");
    try {
      await deleteItem(item.id);
      setData((list) => list.filter((i) => i.id !== item.id));
    } catch (err) {
      setActionError(err.message || "Could not remove the product");
    }
    setConfirmId(null);
  };

  const shown = (items || []).filter(
    (i) =>
      (cat === "all" || i.category === cat) &&
      (show === "all" || (show === "low" && isLow(i)) || (show === "hidden" && i.active === false)) &&
      (!query.trim() || i.name.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const lowCount = (items || []).filter(isLow).length;
  const hiddenCount = (items || []).filter((i) => i.active === false).length;

  return (
    <div className="inv-grid">
      {/* ---------- catalog list ---------- */}
      <section className="panel">
        <div className="dash-row between">
          <h2 className="stack-title small">
            <em>Your shelf</em>
            <strong>Store catalog</strong>
          </h2>
          <span className="pill">{items ? items.length : 0} products</span>
        </div>

        <div className="dash-row filters">
          <input className="search" type="search" placeholder="Search your products" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {CATS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="chips">
          <button className={"chip" + (show === "all" ? " on" : "")} onClick={() => setShow("all")}>
            All
          </button>
          <button className={"chip" + (show === "low" ? " on" : "")} onClick={() => setShow("low")}>
            Low or out of stock ({lowCount})
          </button>
          <button className={"chip" + (show === "hidden" ? " on" : "")} onClick={() => setShow("hidden")}>
            Hidden from buyers ({hiddenCount})
          </button>
        </div>

        {actionError && <p className="form-msg error">{actionError}</p>}
        {error && <ErrorNote error={error} onRetry={reload} />}
        {loading && !items && <Loading text="Loading your products..." />}
        {items && shown.length === 0 && <p className="dash-note">{items.length ? "No products match." : "Your catalog is empty. Add your first product."}</p>}

        <div className="item-list">
          {shown.map((i) => (
            <article key={i.id} className={"item-row" + (i.active === false ? " is-hidden" : "")}>
              <Thumb item={i} />
              <div className="item-info">
                <b>{i.name}</b>
                <span>{CATS.find((c) => c.id === i.category)?.label || i.category}</span>
                {i.description && <span className="item-desc">{i.description}</span>}
                <div className="item-price-block">
                  <span className="item-price">{formatPrice(i.price)}</span>
                  {i.mrp && i.mrp > i.price && (
                    <>
                      <del className="item-mrp">{formatPrice(i.mrp)}</del>
                      <span className="discount-tag">({Math.round(((i.mrp - i.price) / i.mrp) * 100)}% OFF)</span>
                    </>
                  )}
                </div>
                <div className="badges">
                  {i.stock === 0 ? (
                    <span className="badge st-cancel">Out of stock</span>
                  ) : (
                    isLow(i) && <span className="badge st-cancel">Low stock (&lt; 5 left)</span>
                  )}
                  {i.active === false && <span className="badge st-new">Hidden from buyers</span>}
                </div>
              </div>

              <div className="item-side">
                <StockControl item={i} onSet={(n) => change(i, { stock: n })} />
                <div className="item-actions">
                  <button className="link-btn" onClick={() => setEditing(i)}>
                    Edit
                  </button>
                  <button className="link-btn" onClick={() => change(i, { active: i.active === false })}>
                    {i.active === false ? "Show to buyers" : "Hide"}
                  </button>
                  {i.stock > 0 && (
                    <button className="link-btn" onClick={() => change(i, { stock: 0 })}>
                      Mark out of stock
                    </button>
                  )}
                  {confirmId === i.id ? (
                    <span className="confirm">
                      <button className="link-btn danger" onClick={() => remove(i)}>
                        Yes, delete for good
                      </button>
                      <button className="link-btn" onClick={() => setConfirmId(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button className="link-btn danger" onClick={() => setConfirmId(i.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="dash-note left">
          <b>Hide</b> keeps the product and its history but buyers can't see it. <b>Delete</b> removes it permanently.
        </p>
      </section>

      {/* ---------- add product ---------- */}
      <section className="panel add-panel">
        <h2 className="stack-title small">
          <em>New listing</em>
          <strong>Add product</strong>
        </h2>
        <ItemForm
          keepAfterSave
          submitLabel="Publish product"
          busyLabel="Publishing..."
          onSubmit={async (fields, file) => {
            const created = await addItem(fields, file);
            setData((list) => [created, ...(list || [])]);
            return "“" + created.name + "” is now in your catalog.";
          }}
        />
      </section>

      {editing && (
        <Modal title={"Edit " + editing.name} onClose={() => setEditing(null)}>
          <ItemForm
            initial={editing}
            submitLabel="Save changes"
            busyLabel="Saving..."
            onSubmit={async (fields, file) => {
              const saved = await updateItem(editing.id, fields, file);
              patchLocal(editing.id, saved);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}