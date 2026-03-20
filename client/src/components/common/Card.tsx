// Developed by Sydney Edwards
import type { PropsWithChildren } from "react";

type Padding = "sm" | "md" | "lg";

const PADDING_CLASS: Record<Padding, string> = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7"
};

export function Card({
  children,
  className = "",
  padding = "md"
}: PropsWithChildren<{ className?: string; padding?: Padding }>) {
  return (
    <section
      className={[
        "border border-[var(--color-border)] bg-[var(--color-bg-secondary)]",
        PADDING_CLASS[padding],
        className
      ].join(" ")}
    >
      {children}
    </section>
  );
}

