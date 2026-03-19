import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center">
      {icon ? <div className="mx-auto mb-3 inline-flex text-[var(--color-text-muted)]">{icon}</div> : null}
      <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-[52ch] text-[var(--color-text-secondary)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

