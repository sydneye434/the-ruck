export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div
      className={[
        "inline-block animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]",
        sizeClass
      ].join(" ")}
      role="status"
      aria-label="Loading"
    />
  );
}

