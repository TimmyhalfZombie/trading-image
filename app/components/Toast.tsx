"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ToastVariant = "error" | "success" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms, default 5000. Pass Infinity to make it sticky.
}

interface ToastContextValue {
  toast: (opts: Omit<ToastMessage, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  // Convenience helpers
  error: (message: string, title?: string, duration?: number) => string;
  success: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─────────────────────────────────────────────
// Visual config per variant
// ─────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ReactNode;
    iconColor: string;
    iconBg: string;
    barColor: string;
    border: string;
  }
> = {
  error: {
    icon: <AlertCircle className="w-4 h-4 stroke-[2]" />,
    iconColor: "var(--loss)",
    iconBg: "var(--loss-bg)",
    barColor: "var(--loss)",
    border: "var(--loss-border)",
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4 stroke-[2]" />,
    iconColor: "var(--win)",
    iconBg: "var(--win-bg)",
    barColor: "var(--win)",
    border: "var(--win-border)",
  },
  warning: {
    icon: <TriangleAlert className="w-4 h-4 stroke-[2]" />,
    iconColor: "var(--accent)",
    iconBg: "var(--accent-soft)",
    barColor: "var(--accent)",
    border: "var(--accent-glow)",
  },
  info: {
    icon: <Info className="w-4 h-4 stroke-[2]" />,
    iconColor: "var(--text-secondary)",
    iconBg: "var(--bg-secondary)",
    barColor: "var(--text-tertiary)",
    border: "var(--border)",
  },
};

// ─────────────────────────────────────────────
// Single Toast item
// ─────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false); // controls slide-in
  const [exiting, setExiting] = useState(false); // controls slide-out
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const duration = toast.duration ?? Infinity;
  const isSticky = duration === Infinity;
  const cfg = VARIANT_CONFIG[toast.variant];

  // Mount animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss progress & timer
  useEffect(() => {
    if (isSticky) return;

    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        handleDismiss();
      }
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleDismiss = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setExiting(true);
    // Wait for exit animation then remove
    setTimeout(() => onDismiss(toast.id), 400);
  }, [onDismiss, toast.id]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        transform: visible && !exiting ? "translateX(0)" : "translateX(calc(100% + 24px))",
        opacity: visible && !exiting ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.3s ease",
        marginBottom: "10px",
        backgroundColor: "var(--surface)",
        border: `1px solid ${cfg.border}`,
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
        width: "340px",
        maxWidth: "calc(100vw - 32px)",
        position: "relative",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Progress bar */}
      {!isSticky && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "2.5px",
            background: cfg.barColor,
            width: `${progress}%`,
            transition: "width 0.03s linear",
            borderRadius: "0 0 0 16px",
            opacity: 0.7,
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px 16px 14px" }}>
        {/* Icon */}
        <div
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: cfg.iconBg,
            color: cfg.iconColor,
          }}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <p
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "2px",
                lineHeight: "1.3",
              }}
            >
              {toast.title}
            </p>
          )}
          <p
            style={{
              fontSize: "11.5px",
              fontWeight: 500,
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              wordBreak: "break-word",
            }}
          >
            {toast.message}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            flexShrink: 0,
            width: "22px",
            height: "22px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "6px",
            color: "var(--text-tertiary)",
            transition: "background 0.15s, color 0.15s",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
          }}
        >
          <X style={{ width: "13px", height: "13px" }} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toast Container (portal-like fixed layer)
// ─────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

let _uid = 0;
function uid() {
  return `toast-${++_uid}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (opts: Omit<ToastMessage, "id">): string => {
      const id = uid();
      setToasts((prev) => {
        // Cap at 5 visible toasts — remove oldest if over limit
        const next = [...prev, { ...opts, id }];
        return next.length > 5 ? next.slice(next.length - 5) : next;
      });
      return id;
    },
    []
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      toast({ variant: "error", message, title, duration }),
    [toast]
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      toast({ variant: "success", message, title, duration }),
    [toast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      toast({ variant: "warning", message, title, duration }),
    [toast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      toast({ variant: "info", message, title, duration }),
    [toast]
  );

  const value: ToastContextValue = { toast, dismiss, dismissAll, error, success, warning, info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
