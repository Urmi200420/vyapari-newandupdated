import { useState } from "react";
import { useAdmin } from "../AdminContext.jsx";
import { saveCategory, deleteCategory, saveSubcategory, deleteSubcategory } from "../data/store.js";
import { Title, Search, StatCard, Empty, Confirm, Modal, GlassButton, fmtDate, num, matches } from "../ui.jsx";

const ICONS = ["📱", "💻", "🎧", "👗", "👕", "👟", "🏺", "🛋️", "🍳", "💄", "🧴", "🥦", "🍎", "🧺", "📚", "🏏", "🧘", "🧸", "🎮", "🐶", "🚗", "💍", "🎁", "🌿", "🏷️"];

export default function CatalogManagement() {
  const { db, run } = useAdmin();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // {} for new, category for edit
  const [confirm, setConfirm] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set(db.categories.slice(0, 2).map((c) => c.id)));

  const list = db.categories.filter((c) => matches(q, c.name, c.description, ...c.subcategories.map((s) => s.name)));
  const subs = db.categories.reduce((n, c) => n + c.subcategories.length, 0);
  const products = db.categories.reduce((n, c) => n + c.subcategories.reduce((m, s) => m + s.products, 0), 0);
  const toggle = (id) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="dash-stack ad-stack">
      <div className="stat-grid">
        <StatCard icon="🗂️" label="Categories" value={num(db.categories.length)} note="Top-level departments" />
        <StatCard icon="🧩" label="Subcategories" value={num(subs)} note={"About " + (subs / Math.max(1, db.categories.length)).toFixed(1) + " per category"} />
        <StatCard icon="🛍️" label="Listed products" value={num(products)} note="Across every subcategory" />
        <StatCard icon="🏪" label="Sellers per category" value={(db.sellers.filter((s) => s.status === "ACTIVE").reduce((n, s) => n + s.categories.length, 0) / Math.max(1, db.categories.length)).toFixed(1)} note="Average active sellers" />
      </div>

      <section className="panel">
        <Title em="Departments & aisles" strong="Product categories">
          <GlassButton variant="solid" onClick={() => setEditing({})}>
            + Add category
          </GlassButton>
        </Title>
        <div className="dash-row filters">
          <Search value={q} onChange={setQ} placeholder="Search categories or subcategories" />
          <GlassButton className="ad-sm" onClick={() => setExpanded(new Set(list.map((c) => c.id)))}>
            Expand all
          </GlassButton>
          <GlassButton className="ad-sm" onClick={() => setExpanded(new Set())}>
            Collapse all
          </GlassButton>
        </div>
        <p className="dash-note left ad-small">Changes are saved in the admin demo on this browser. The storefront's category menu is not changed.</p>

        {list.length === 0 ? (
          <Empty icon="🔎" text={q ? "No category or subcategory matches your search." : "No categories yet. Add the first one."} />
        ) : (
          <div className="ad-cat-list">
            {list.map((c) => {
              const count = c.subcategories.reduce((m, s) => m + s.products, 0);
              const isOpen = expanded.has(c.id) || !!q;
              return (
                <article key={c.id} className={"ad-cat" + (isOpen ? " open" : "")}>
                  <div className="ad-cat-head">
                    <button type="button" className="ad-cat-toggle" onClick={() => toggle(c.id)} aria-expanded={isOpen}>
                      <span className="ad-cat-icon">{c.icon}</span>
                      <span className="ad-cat-title">
                        <b>{c.name}</b>
                        <span>
                          {c.subcategories.length} subcategor{c.subcategories.length === 1 ? "y" : "ies"} · {num(count)} products{c.createdAt ? " · since " + fmtDate(c.createdAt) : ""}
                        </span>
                      </span>
                      <span className="ad-chevron">{isOpen ? "▴" : "▾"}</span>
                    </button>
                    <div className="ad-row-actions end">
                      <button type="button" className="link-btn" onClick={() => setEditing(c)}>
                        Edit
                      </button>
                      <button type="button" className="link-btn danger" onClick={() => setConfirm({ kind: "cat", c, count })}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="ad-cat-body">
                      {c.description && <p className="muted ad-small">{c.description}</p>}
                      <div className="ad-sub-list">
                        {c.subcategories.map((s) => (
                          <SubRow key={s.id} c={c} s={s} onDelete={() => setConfirm({ kind: "sub", c, s })} />
                        ))}
                        {c.subcategories.length === 0 && <p className="dash-note left">No subcategories yet.</p>}
                      </div>
                      <AddSub c={c} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing && <CategoryForm c={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      {confirm?.kind === "cat" && (
        <Confirm
          title="Delete category?"
          message={
            <>
              <b>
                {confirm.c.icon} {confirm.c.name}
              </b>{" "}
              and its {confirm.c.subcategories.length} subcategories will be deleted.
              {confirm.count > 0 && <span className="ad-quote">{num(confirm.count)} listed products would need a new category.</span>}
            </>
          }
          confirm="Delete category"
          danger
          onConfirm={() => run(deleteCategory, confirm.c.id)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "sub" && (
        <Confirm
          title="Delete subcategory?"
          message={
            <>
              <b>{confirm.s.name}</b> will be removed from {confirm.c.name}.
              {confirm.s.products > 0 && <span className="ad-quote">{num(confirm.s.products)} products are listed here.</span>}
            </>
          }
          confirm="Delete"
          danger
          onConfirm={() => run(deleteSubcategory, confirm.c.id, confirm.s.id)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function SubRow({ c, s, onDelete }) {
  const { run } = useAdmin();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(s.name);
  const save = (e) => {
    e.preventDefault();
    if (name.trim() === s.name) return setEdit(false);
    if (run(saveSubcategory, c.id, s.id, name)) setEdit(false);
  };
  return (
    <div className="ad-sub">
      {edit ? (
        <form className="ad-inline-add grow" onSubmit={save}>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Subcategory name" onKeyDown={(e) => e.key === "Escape" && (setName(s.name), setEdit(false))} />
          <GlassButton type="submit" className="ad-sm" variant="solid">
            Save
          </GlassButton>
          <GlassButton
            className="ad-sm"
            onClick={() => {
              setName(s.name);
              setEdit(false);
            }}
          >
            Cancel
          </GlassButton>
        </form>
      ) : (
        <>
          <span className="ad-sub-name">{s.name}</span>
          <span className="muted ad-small">{num(s.products)} products</span>
          <div className="ad-row-actions end">
            <button type="button" className="link-btn" onClick={() => setEdit(true)}>
              Rename
            </button>
            <button type="button" className="link-btn danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddSub({ c }) {
  const { run } = useAdmin();
  const [name, setName] = useState("");
  const add = (e) => {
    e.preventDefault();
    if (run(saveSubcategory, c.id, null, name)) setName("");
  };
  return (
    <form className="ad-inline-add" onSubmit={add}>
      <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={"New subcategory in " + c.name} aria-label={"New subcategory in " + c.name} />
      <GlassButton type="submit" className="ad-sm" disabled={!name.trim()}>
        + Add subcategory
      </GlassButton>
    </form>
  );
}

function CategoryForm({ c, onClose }) {
  const { run } = useAdmin();
  const [f, setF] = useState({ name: c?.name || "", icon: c?.icon || "🏷️", description: c?.description || "" });
  const submit = (e) => {
    e.preventDefault();
    if (run(saveCategory, c?.id || null, f)) onClose();
  };
  return (
    <Modal title={c ? "Edit category" : "Add category"} onClose={onClose}>
      <form className="add-form ad-form" onSubmit={submit}>
        <label className="field">
          Category name
          <input required maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Pet Supplies" autoFocus />
        </label>
        <div className="field">
          Icon
          <div className="ad-icon-pick">
            {ICONS.map((i) => (
              <button type="button" key={i} className={f.icon === i ? "on" : ""} onClick={() => setF({ ...f, icon: i })} aria-label={"Use " + i} aria-pressed={f.icon === i}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Description
          <textarea rows="3" maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Shown to sellers when they pick a category (optional)" />
        </label>
        <div className="ad-preview-cat">
          <span className="ad-cat-icon">{f.icon}</span>
          <b>{f.name || "Category name"}</b>
        </div>
        <div className="ad-modal-actions">
          <GlassButton onClick={onClose}>Cancel</GlassButton>
          <GlassButton type="submit" variant="solid">
            {c ? "Save changes" : "Add category"}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}
