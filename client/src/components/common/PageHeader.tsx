import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
      <div>
        <h1 className="font-heading text-4xl leading-none text-[var(--color-text-primary)]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

