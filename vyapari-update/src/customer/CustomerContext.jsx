import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Button from "../components/GlassButton.jsx";
import { addItem, loadState, parseState, storageKey } from "./store.js";
import "./customer.css";
const CustomerContext = createContext(null);
export function CustomerProvider({ children }) {
  const [state, setState] = useState(loadState);
  const current = useRef(state);
  const [storageError, setStorageError] = useState(false);
  const [toast, notify] = useState("");
  const [prompt, setPrompt] = useState(false);
  // Commit once outside React's state updater, including in StrictMode.
  const update = useCallback((change, options = {}) => {
    const next =
      typeof change === "function" ? change(current.current) : change;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("vyapari-customer-state"));
      setStorageError(false);
    } catch {
      setStorageError(true);
      if (options.requirePersistence)
        throw Error(
          "Your browser could not save this complaint. Remove supporting images or free some site storage, then try again.",
        );
    }
    current.current = next;
    setState(next);
    return next;
  }, []);
  useEffect(() => {
    const sync = (event) => {
      if (event.key !== storageKey || event.storageArea !== localStorage)
        return;
      const next =
        event.newValue === null ? loadState() : parseState(event.newValue);
      if (next) {
        current.current = next;
        setState(next);
      }
    };
    const localSync = () => {
      const next = loadState();
      current.current = next;
      setState(next);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("vyapari-customer-state", localSync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("vyapari-customer-state", localSync);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => notify(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const add = (id, amount = 1) => {
    if (current.current.mode !== "registered") {
      setPrompt(true);
      return false;
    }
    try {
      update((s) => addItem(s, id, amount));
      notify("Added to your cart.");
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    }
  };
  return (
    <CustomerContext.Provider
      value={{
        state,
        update,
        add,
        notify,
        storageError,
        requestDemo: () => setPrompt(true),
      }}
    >
      {children}
      {toast && (
        <div role="status" className="cu-toast glass-panel">
          {toast}
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            ×
          </button>
        </div>
      )}
      {prompt && (
        <DemoModal
          close={() => setPrompt(false)}
          enter={() => {
            update((s) => ({ ...s, mode: "registered" }));
            setPrompt(false);
            notify("Registered User demo enabled. You can now shop.");
          }}
        />
      )}
    </CustomerContext.Provider>
  );
}
export function useCustomer() {
  const context = useContext(CustomerContext);
  if (!context)
    throw Error("Customer components must be inside CustomerProvider.");
  return context;
}
function DemoModal({ close, enter }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    ref.current.showModal();
    return () => before?.focus();
  }, []);
  return (
    <dialog ref={ref} className="cu-modal" onCancel={close}>
      <button
        className="cu-modal-close"
        aria-label="Close dialog"
        onClick={close}
      >
        ×
      </button>
      <p className="eyebrow">Welcome to Vyapari</p>
      <h2>Try the customer experience.</h2>
      <p>
        Guests can browse. Continue as a registered demo customer to add to your
        cart, checkout and track sample orders. No credentials are needed.
      </p>
      <Button variant="solid" onClick={enter}>
        Continue as demo customer
      </Button>
      <Button onClick={close}>Keep browsing</Button>
    </dialog>
  );
}
