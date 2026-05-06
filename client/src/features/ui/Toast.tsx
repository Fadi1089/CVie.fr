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

type ToastVariant = "default" | "success" | "error" | "info";

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
const STYLE_TAG_ID = "cvie-toast-keyframes";

const VARIANT_STYLES: Record<
  ToastVariant,
  { background: string; color: string; ring: string; glow: string }
> = {
  success: {
    background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
    color: "#ffffff",
    ring: "rgba(22, 163, 74, 0.45)",
    glow: "rgba(22, 163, 74, 0.55)",
  },
  error: {
    background: "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)",
    color: "#ffffff",
    ring: "rgba(220, 38, 38, 0.45)",
    glow: "rgba(220, 38, 38, 0.55)",
  },
  info: {
    background: "linear-gradient(180deg, #1e3a5f 0%, #0f2540 100%)",
    color: "#ffffff",
    ring: "rgba(30, 58, 95, 0.45)",
    glow: "rgba(30, 58, 95, 0.5)",
  },
  default: {
    background: "linear-gradient(180deg, #1f1f1f 0%, #0a0a0a 100%)",
    color: "#ffffff",
    ring: "rgba(0, 0, 0, 0.4)",
    glow: "rgba(0, 0, 0, 0.45)",
  },
};

function ensureKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
@keyframes cvie-toast-bloom {
  0%   { transform: translateY(28px) scale(0.78); opacity: 0; filter: blur(6px); }
  55%  { transform: translateY(-6px) scale(1.05);  opacity: 1; filter: blur(0); }
  100% { transform: translateY(0)    scale(1);     opacity: 1; filter: blur(0); }
}
@keyframes cvie-toast-glow {
  0%   { box-shadow: 0 0 0 0 var(--cvie-toast-glow), 0 14px 32px -10px rgba(0,0,0,0.45); }
  60%  { box-shadow: 0 0 0 14px transparent, 0 14px 32px -10px rgba(0,0,0,0.45); }
  100% { box-shadow: 0 0 0 0 transparent, 0 14px 32px -10px rgba(0,0,0,0.35); }
}
.cvie-toast {
  animation:
    cvie-toast-bloom 380ms cubic-bezier(0.22, 1, 0.36, 1) both,
    cvie-toast-glow  900ms ease-out both;
}
@media (prefers-reduced-motion: reduce) {
  .cvie-toast {
    animation: none;
  }
}
`.trim();
  document.head.appendChild(style);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    ensureKeyframes();
  }, []);

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
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "center",
            gap: "0.5rem",
            pointerEvents: "none",
          }}
        >
          {toasts.map((t) => {
            const v = VARIANT_STYLES[t.variant];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => dismiss(t.id)}
                className="cvie-toast"
                style={
                  {
                    pointerEvents: "auto",
                    background: v.background,
                    color: v.color,
                    padding: "0.625rem 1rem",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily:
                      "system-ui, -apple-system, 'SF Pro Text', sans-serif",
                    border: `1px solid ${v.ring}`,
                    cursor: "pointer",
                    maxWidth: "min(28rem, 90vw)",
                    textAlign: "center",
                    letterSpacing: "0.01em",
                    "--cvie-toast-glow": v.glow,
                  } as React.CSSProperties
                }
              >
                {t.message}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { push: () => {} };
  }
  return ctx;
}
