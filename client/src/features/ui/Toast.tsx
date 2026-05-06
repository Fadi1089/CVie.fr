import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  push: (message: string, opts?: { variant?: ToastVariant }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2_500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message: string, opts?: { variant?: ToastVariant }) => {
      const id = ++seq.current;
      const variant = opts?.variant ?? "default";
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  if (typeof document === "undefined") {
    return (
      <ToastContext.Provider value={{ push }}>{children}</ToastContext.Provider>
    );
  }

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: "auto",
                background:
                  t.variant === "error"
                    ? "#dc2626"
                    : t.variant === "success"
                      ? "#0a0a0a"
                      : "#0a0a0a",
                color: "white",
                padding: "0.625rem 0.875rem",
                borderRadius: "0.375rem",
                fontSize: "13px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                border: "none",
                cursor: "pointer",
                maxWidth: "20rem",
                textAlign: "left",
              }}
            >
              {t.message}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op so calling components don't crash if provider is absent.
    return { push: () => {} };
  }
  return ctx;
}
