import { useRef, useState } from "react";
import { categories } from "../data.js";
import GlassButton from "../components/GlassButton.jsx";

export const CATS = categories.filter((c) => c.id !== "all");

/*
  The product form, used for both "Add product" and "Edit product".
  Price Form Fields:
  - MRP / Original Price: The theoretical maximum price of the item.
  - Selling Price: The actual price the buyer pays at checkout.
  - Discount calculation: ((MRP - Selling Price) / MRP) * 100
*/
export default function ItemForm({ initial, onSubmit, submitLabel, busyLabel, keepAfterSave }) {
  const blank = { name: "", description: "", category: CATS[0].id, mrp: "", price: "", stock: "" };
  const start = initial
    ? {
        name: initial.name,
        description: initial.description || "",
        category: initial.category,
        mrp: initial.mrp !== undefined ? initial.mrp : Math.round(initial.price * 1.35),
        price: initial.price,
        stock: initial.stock,
      }
    : blank;

  const [form, setForm] = useState(start);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.imageUrl || "");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const input = useRef(null);

  const numMrp = Number(form.mrp);
  const numPrice = Number(form.price);
  const discount =
    numMrp > numPrice && numPrice > 0 ? Math.round(((numMrp - numPrice) / numMrp) * 100) : 0;

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/"))
      return setMsg({ type: "error", text: "Please choose a picture (JPG, PNG or WebP)." });
    if (f.size > 5 * 1024 * 1024)
      return setMsg({ type: "error", text: "That picture is over 5 MB. Choose a smaller one." });
    setMsg({ type: "", text: "" });
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    const p = Number(form.price);
    const m = Number(form.mrp);
    const s = Number(form.stock);

    if (p <= 0) return setMsg({ type: "error", text: "Selling price must be more than ₹0." });
    if (m > 0 && p > m) {
      return setMsg({ type: "error", text: "Selling price cannot exceed the Maximum Retail Price (MRP)." });
    }
    if (s < 0 || !Number.isInteger(s)) {
      return setMsg({ type: "error", text: "Stock must be a whole non-negative number." });
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        mrp: m > 0 ? m : Math.round(p * 1.35),
        price: p,
        stock: s,
      };
      const done = await onSubmit(payload, file);
      if (keepAfterSave) {
        setForm(blank);
        setFile(null);
        setPreview("");
        if (input.current) input.current.value = "";
        setMsg({ type: "ok", text: done || "Saved successfully." });
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Could not save product." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="add-form">
      <label className="field">
        Product title
        <input
          required
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Organic Pure Honey 500g"
        />
      </label>

      <label className="field">
        Description
        <textarea
          rows="3"
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What should buyers know about this product?"
        />
      </label>

      {/* MRP & Selling Price (checkpoint for pricing controls) */}
      <div className="two-fields">
        <label className="field">
          MRP / Original Price (₹)
          <input
            required
            type="number"
            min="1"
            step="any"
            value={form.mrp}
            onChange={(e) => setForm({ ...form, mrp: e.target.value })}
            placeholder="1499"
          />
          <span className="field-hint">Maximum Retail Price</span>
        </label>

        <label className="field">
          Selling Price (₹)
          <input
            required
            type="number"
            min="1"
            step="any"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="999"
          />
          <span className="field-hint">Buyer pays this at checkout</span>
        </label>
      </div>

      {/* Live price & discount calculation preview */}
      {numPrice > 0 && (
        <div className="price-preview-box">
          <span className="preview-label">Live Catalog Display:</span>
          <div className="price-display-sample">
            <span className="sp-bold">₹{numPrice.toLocaleString("en-IN")}</span>
            {numMrp > numPrice && (
              <>
                <del className="mrp-strike">₹{numMrp.toLocaleString("en-IN")}</del>
                <span className="discount-tag">({discount}% OFF)</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="two-fields">
        <label className="field">
          Stock units
          <input
            required
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            placeholder="50"
          />
          <span className="field-hint">&lt; 5 units will flag low stock</span>
        </label>

        <label className="field">
          Category
          <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <span className="field-hint">Department</span>
        </label>
      </div>

      <div className="field">
        Product picture
        <div
          className={"drop" + (dragging ? " over" : "") + (preview ? " has" : "")}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        >
          {preview ? <img src={preview} alt="Preview" /> : <span>📷 Drop a picture here, or click to choose</span>}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
        {preview && file && (
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setFile(null);
              setPreview(initial?.imageUrl || "");
              if (input.current) input.current.value = "";
            }}
          >
            Undo new picture
          </button>
        )}
      </div>

      {msg.text && <p className={"form-msg " + msg.type}>{msg.text}</p>}

      <GlassButton type="submit" variant="solid" block disabled={busy}>
        {busy ? busyLabel : submitLabel}
      </GlassButton>
    </form>
  );
}
