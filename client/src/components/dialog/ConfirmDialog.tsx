// Developed by Sydney Edwards
import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-bg-primary) 80%, transparent)" }}
    >
      <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h2 className="font-heading text-3xl leading-none text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">{description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border border-[var(--color-danger)] bg-[var(--color-danger)] px-3 py-1.5 text-[var(--color-text-primary)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

