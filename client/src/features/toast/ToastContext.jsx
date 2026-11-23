import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "./toast.css";

const ToastContext = createContext(null);
const DEFAULT_DURATION = 3500;
const MAX_VISIBLE = 4;

const ICONS = { success: "✓", error: "!", info: "i" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = "info", duration = DEFAULT_DURATION) => {
      if (!message) return null;
      const text = String(message);
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => {
        // Collapse identical consecutive toasts instead of stacking duplicates.
        if (list.length && list[list.length - 1].message === text && list[list.length - 1].type === type) return list;
        return [...list, { id, message: text, type }].slice(-MAX_VISIBLE);
      });
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (m, d) => show(m, "success", d),
      error: (m, d) => show(m, "error", d ?? 5000),
      info: (m, d) => show(m, "info", d),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === "error" ? "alert" : "status"} aria-live={t.type === "error" ? "assertive" : "polite"}>
            <span className="toast-icon" aria-hidden="true">{ICONS[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
