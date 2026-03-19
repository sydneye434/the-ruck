const badgeStyles = {
  default: "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]",
  accent: "border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]",
  success: "border-[var(--color-success)] bg-[var(--color-bg-tertiary)] text-[var(--color-success)]",
  warning: "border-[var(--color-warning)] bg-[var(--color-bg-tertiary)] text-[var(--color-warning)]",
  danger: "border-[var(--color-danger)] bg-[var(--color-bg-tertiary)] text-[var(--color-danger)]"
} as const;

export function Badge({
  label,
  color = "default"
}: {
  label: string;
  color?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={[
        "inline-flex items-center border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]",
        badgeStyles[color]
      ].join(" ")}
    >
      {label}
    </span>
  );
}

