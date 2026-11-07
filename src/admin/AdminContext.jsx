import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { buildSeed } from "./data/seed.js";
import { loadDb, saveDb, readExternalTickets, importExternalTickets, STORAGE_KEY } from "./data/store.js";

/*
  Holds the admin dataset for every admin screen.
    const { db, run, notify } = useAdmin();
    run(approveSeller, id)   → applies a store action, saves it, shows a toast; returns true on success
*/
const AdminCtx = createContext(null);
export const useAdmin = () => useContext(AdminCtx);

export function AdminProvider({ children }) {
  const [db, setDb] = useState(() => loadDb());
  const [toasts, setToasts] = useState([]);
  const dbRef = useRef(db);

  useEffect(() => {
    dbRef.current = db;
    saveDb(db);
  }, [db]);

  const notify = useCallback((text, tone = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const commit = (next) => {
    dbRef.current = next;
    setDb(next);
  };

  const run = useCallback(
    (action, ...args) => {
      const res = action(dbRef.current, ...args);
      if (!res.error) commit(res.db);
      if (res.message) notify(res.message, res.error ? "error" : "ok");
      return !res.error;
    },
    [notify]
  );

  const reset = useCallback(() => {
    // keep the import map so tickets already copied from the other dashboards are re-imported cleanly
    commit(buildSeed(Date.now()));
    notify("Demo data reset to the original sample.");
  }, [notify]);

  // copy tickets raised in the customer / seller / delivery dashboards on this browser
  useEffect(() => {
    let first = true;
    const sync = () => {
      const next = importExternalTickets(dbRef.current, readExternalTickets());
      if (next) {
        const added = next.tickets.length - dbRef.current.tickets.length;
        commit(next);
        if (!first) notify(added === 1 ? "1 new ticket arrived from another dashboard." : added + " new tickets arrived from other dashboards.");
      }
      first = false;
    };
    sync();
    const onStorage = (e) => e.key !== STORAGE_KEY && sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
  }, [notify]);

  return (
    <AdminCtx.Provider value={{ db, run, notify, reset }}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"ad-toast glass-panel" + (t.tone === "error" ? " is-error" : "")}>
            <span>{t.tone === "error" ? "⚠️" : "✓"}</span>
            {t.text}
          </div>
        ))}
      </div>
    </AdminCtx.Provider>
  );
}
