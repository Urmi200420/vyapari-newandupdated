import { useCallback, useEffect, useRef, useState } from "react";

// Loads data from the API and keeps track of loading / error. Call reload() to refresh.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    return fn()
      .then((data) => alive.current && setState({ data, error: "", loading: false }))
      .catch((e) => alive.current && setState((s) => ({ ...s, error: e.message || "Could not load", loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = (updater) =>
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  return { ...state, reload: run, setData };
}

export const STATUS = {
  PENDING: { label: "New order", cls: "st-new" },
  PACKED: { label: "Packed", cls: "st-packed" },
  READY_FOR_PICKUP: { label: "Ready for pickup", cls: "st-ready" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", cls: "st-out" },
  DELIVERED: { label: "Delivered", cls: "st-done" },
  CANCELLED: { label: "Cancelled", cls: "st-cancel" },
  REJECTED: { label: "Rejected", cls: "st-cancel" },
  RETURNED: { label: "Returned", cls: "st-cancel" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, cls: "st-new" };
  return <span className={"badge " + s.cls}>{s.label}</span>;
}

// "Low stock" means fewer than this many left
export const LOW_STOCK_BELOW = 5;
export const isLow = (item) => item.stock < LOW_STOCK_BELOW;

// ★★★★☆ for a rating from 0 to 5 (decimals are rounded)
export function Stars({ value }) {
  const n = Math.round(value);
  return (
    <span className="stars-row" aria-label={value.toFixed(1) + " out of 5"}>
      {"★★★★★".slice(0, n)}
      <span className="dim">{"★★★★★".slice(n)}</span>
    </span>
  );
}

// A pop-up window. Closes with the Esc key or by clicking outside it.
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal glass-panel" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head no-print">
          <h2 className="modal-title">{title}</h2>
          <button className="close-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body" data-lenis-prevent>
          {children}
        </div>
      </div>
    </div>
  );
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function Loading({ text = "Loading..." }) {
  return <p className="dash-note">{text}</p>;
}
export function ErrorNote({ error, onRetry }) {
  return (
    <div className="dash-note error-note">
      <span>⚠️ {error}</span>
      {onRetry && (
        <button className="link-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}