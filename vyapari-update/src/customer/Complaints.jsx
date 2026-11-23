import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/GlassButton.jsx";
import { Heading } from "./shared.jsx";
import { money } from "./data.js";
import { newId } from "./store.js";
import { useCustomer } from "./CustomerContext.jsx";
import {
  complaintCategories,
  createComplaint,
  readComplaintImages,
} from "./complaintService.js";
export function Complaints() {
  const { state, update, notify } = useCustomer();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const choices = state.orders.flatMap((order) =>
    order.items.map((product) => ({
      key: `${order.id}/${product.id}`,
      order,
      product,
    })),
  );
  const complaints = state.complaints.filter(
    (c) => c.customerId === state.customerId,
  );
  const submit = (input) => {
    let saved;
    update(
      (current) => {
        const result = createComplaint(current, input);
        saved = result.complaint;
        return result.state;
      },
      { requirePersistence: true },
    );
    setOpen(false);
    notify(`Complaint ${saved.id} submitted and saved.`);
    navigate(`/customer/complaints/${saved.id}`);
  };
  return (
    <>
      <Heading eyebrow="Support for your purchases">My Complaints.</Heading>
      <section className="cu-panel cu-between">
        <div>
          <h2>How can we help?</h2>
          <p>Tell us about an issue with a product from your orders.</p>
        </div>
        <Button
          variant="solid"
          disabled={!choices.length || open}
          onClick={() => setOpen(true)}
        >
          Raise a Complaint
        </Button>
      </section>
      {!choices.length && (
        <section className="cu-panel">
          <p>You can raise a complaint after placing an order.</p>
          <Button to="/customer/shop">Explore the shop</Button>
        </section>
      )}
      {open && (
        <ComplaintForm
          choices={choices}
          submit={submit}
          cancel={() => setOpen(false)}
        />
      )}
      <div className="cu-between">
        <h2>Complaint history</h2>
        <span className="cu-muted">
          {complaints.length}{" "}
          {complaints.length === 1 ? "complaint" : "complaints"}
        </span>
      </div>
      {complaints.length === 0 && (
        <section className="cu-panel cu-empty">
          <h2>No complaints yet</h2>
          <p>Your submitted product complaints will appear here.</p>
        </section>
      )}
      {complaints.map((c) => (
        <article className="cu-panel cu-order" key={c.id}>
          <div className="cu-between">
            <h3>{c.id}</h3>
            <Status status={c.status} />
          </div>
          <div className="cu-line">
            <img src={c.product.image} alt={c.product.name} />
            <div>
              <h3>{c.product.name}</h3>
              <p>{c.category}</p>
              <small>Order {c.orderId}</small>
            </div>
          </div>
          <p className="cu-complaint-text">{c.description}</p>
          <div className="cu-between">
            <time dateTime={c.date}>
              {new Date(c.date).toLocaleString("en-IN")}
            </time>
            <Button to={`/customer/complaints/${c.id}`}>View complaint</Button>
          </div>
        </article>
      ))}
    </>
  );
}
function Status({ status }) {
  return (
    <span className="cu-badge" aria-label={`Complaint status: ${status}`}>
      {status}
    </span>
  );
}
function ComplaintForm({ choices, submit, cancel }) {
  const [selection, select] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const readVersion = useRef(0);
  const requestId = useRef(newId());
  const chosen = choices.find((c) => c.key === selection);
  async function upload(event) {
    const version = ++readVersion.current;
    const files = Array.from(event.target.files || []);
    setError("");
    setReading(true);
    setImages([]);
    try {
      const result = await readComplaintImages(files);
      if (version === readVersion.current) setImages(result);
    } catch (error) {
      if (version === readVersion.current) setError(error.message);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
    event.target.value = "";
  }
  function send(event) {
    event.preventDefault();
    if (locked.current || reading) return;
    setError("");
    locked.current = true;
    setSending(true);
    try {
      submit({
        orderId: chosen?.order.id,
        productId: chosen?.product.id,
        category,
        description,
        images,
        requestId: requestId.current,
      });
    } catch (error) {
      setError(error.message);
      locked.current = false;
      setSending(false);
    }
  }
  return (
    <form
      className="cu-panel cu-form"
      onSubmit={send}
      aria-label="Raise a complaint"
    >
      <h2>Raise a Complaint</h2>
      <label>
        Purchased product
        <select
          required
          value={selection}
          onChange={(e) => select(e.target.value)}
        >
          <option value="">Select an ordered product</option>
          {choices.map((c) => (
            <option key={c.key} value={c.key}>
              {c.product.name} · {c.order.id}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <div className="cu-line">
          <img src={chosen.product.image} alt={chosen.product.name} />
          <div>
            <h3>{chosen.product.name}</h3>
            <p>
              {money(chosen.product.price)} · Quantity purchased:{" "}
              {chosen.product.quantity}
            </p>
            <p>Order ID: {chosen.order.id}</p>
          </div>
        </div>
      )}
      <label>
        Complaint category
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Select a category</option>
          {complaintCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Complaint description
        <textarea
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-describedby="complaint-description-help"
        />
      </label>
      <p id="complaint-description-help" className="cu-muted">
        {description.trim().length}/2,000 characters · Minimum 20 characters.
      </p>
      <label>
        Supporting images (optional)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={reading || sending}
          onChange={upload}
          aria-describedby="complaint-image-help"
        />
      </label>
      <p id="complaint-image-help" className="cu-muted">
        JPEG, PNG or WebP. Up to 3 images, 512 KB per image and 1 MB in total.
        Choosing files replaces the current selection.
      </p>
      {reading && <p role="status">Preparing image previews…</p>}
      {images.length > 0 && (
        <div className="cu-complaint-images">
          {images.map((image, index) => (
            <figure key={`${image.name}-${index}`}>
              <img
                src={image.dataUrl}
                alt={`Supporting image ${index + 1}: ${image.name}`}
              />
              <figcaption>{image.name}</figcaption>
              <Button
                onClick={() =>
                  setImages((list) => list.filter((_, i) => i !== index))
                }
              >
                Remove image {index + 1}
              </Button>
            </figure>
          ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="cu-actions">
        <Button type="submit" variant="solid" disabled={reading || sending}>
          {sending ? "Saving complaint…" : "Submit Complaint"}
        </Button>
        <Button disabled={sending} onClick={cancel}>
          Cancel
        </Button>
      </div>
      <p className="cu-muted">
        Demo mode: your complaint is saved in this browser and shared with the
        seller dashboard. Seller replies and status updates will appear here.
      </p>
    </form>
  );
}
export function ComplaintDetails() {
  const { id } = useParams();
  const { state, update } = useCustomer();
  const c = state.complaints.find(
    (c) => c.id === id && c.customerId === state.customerId,
  );
  useEffect(() => {
    if (!c) return;
    const unread = (state.notifications || []).some((n) => n.complaintId === id && n.recipientId === state.customerId && !n.read);
    if (unread) update((current) => ({ ...current, notifications: (current.notifications || []).map((n) => n.complaintId === id && n.recipientId === current.customerId ? { ...n, read: true } : n) }));
  }, [id, c?.id]);
  if (!c)
    return (
      <section className="cu-panel cu-empty">
        <h2>Complaint not found</h2>
        <Button to="/customer/complaints">Back to My Complaints</Button>
      </section>
    );
  return (
    <>
      <Link to="/customer/complaints">← Back to My Complaints</Link>
      <Heading eyebrow="Your product support request">
        Complaint details.
      </Heading>
      <section className="cu-panel cu-stack">
        <div className="cu-between">
          <h2>{c.id}</h2>
          <Status status={c.status} />
        </div>
        <time dateTime={c.date}>
          Submitted {new Date(c.date).toLocaleString("en-IN")}
        </time>
        <div className="cu-line">
          <img src={c.product.image} alt={c.product.name} />
          <div>
            <h3>{c.product.name}</h3>
            <p>{money(c.product.price)}</p>
            <Link to={`/customer/order/${c.orderId}`}>Order {c.orderId} →</Link>
          </div>
        </div>
        <h3>{c.category}</h3>
        <p className="cu-complaint-text">{c.description}</p>
        {c.images.length > 0 && (
          <>
            <h3>Supporting images</h3>
            <div className="cu-complaint-images">
              {c.images.map((image, i) => (
                <figure key={i}>
                  <img
                    src={image.dataUrl}
                    alt={`Supporting image ${i + 1}: ${image.name}`}
                  />
                  <figcaption>{image.name}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        {state.notifications?.filter((n) => n.complaintId === c.id && n.recipientId === state.customerId).length > 0 && <section className="cu-review"><b>Notifications</b>{state.notifications.filter((n) => n.complaintId === c.id && n.recipientId === state.customerId).map((n) => <p key={n.id}>{n.message} · <time>{new Date(n.date).toLocaleString("en-IN")}</time></p>)}</section>}
        <h3>Updates and resolution</h3>
        <p>{c.resolutionRemarks || "No resolution remarks have been provided yet."}</p>
        {c.resolutionType && <p><b>Proposed resolution:</b> {c.resolutionType}</p>}
        {(c.timeline || []).map((item, i) => (
          <article className="cu-review" key={`${item.date}-${i}`}>
            <b>{item.author || "Vyapari"} · {item.type === "submitted" ? "Submitted" : item.type === "status" ? "Status update" : item.type === "resolution" ? "Resolution" : "Response"}</b>
            <time dateTime={item.date}>{new Date(item.date).toLocaleString("en-IN")}</time>
            <p className="cu-complaint-text">{item.message}</p>
          </article>
        ))}
        {(c.responses || []).map((r, i) => (
          <article className="cu-review" key={`response-${i}`}>
            <b>{r.author}</b>
            <time dateTime={r.date}>{new Date(r.date).toLocaleString("en-IN")}</time>
            <p className="cu-complaint-text">{r.message}</p>
          </article>
        ))}
        <p className="cu-muted">
          { ["Resolved", "Rejected"].includes(c.status)
            ? "This complaint is closed. Its full history remains available here."
            : "You can follow seller replies and status changes here."}
        </p>
      </section>
    </>
  );
}
