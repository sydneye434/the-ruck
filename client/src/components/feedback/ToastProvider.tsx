// Developed by Sydney Edwards
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastClass(type: ToastType) {
  if (type === "success") return "border-[var(--color-success)] text-[var(--color-success)]";
  if (type === "error") return "border-[var(--color-danger)] text-[var(--color-danger)]";
  return "border-[var(--color-accent)] text-[var(--color-accent)]";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[340px] max-w-[90vw] flex-col gap-2">
        {items.map((toast) => (
          <div
            key={toast.id}
            className={[
              "pointer-events-auto border bg-[var(--color-bg-secondary)] px-3 py-2 text-sm shadow-lg",
              toastClass(toast.type)
            ].join(" ")}
          >
            <p className="font-semibold uppercase tracking-[0.08em]">{toast.type}</p>
            <p className="mt-0.5 text-[var(--color-text-primary)]">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return {
    success: (message: string) => ctx.pushToast({ type: "success", message }),
    error: (message: string) => ctx.pushToast({ type: "error", message }),
    info: (message: string) => ctx.pushToast({ type: "info", message })
  };
}

