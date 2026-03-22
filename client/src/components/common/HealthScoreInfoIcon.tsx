// Developed by Sydney Edwards
import { HEALTH_SCORE_TOOLTIP } from "../../lib/healthScoreInfo";

type Props = {
  /** Override default tooltip (e.g. shorter on small screens). */
  title?: string;
  className?: string;
};

/**
 * Info icon with hover/focus tooltip (`title`) explaining how Sprint Health Score is calculated.
 */
export function HealthScoreInfoIcon({ title = HEALTH_SCORE_TOOLTIP, className = "" }: Props) {
  return (
    <button
      type="button"
      className={[
        "inline-flex shrink-0 cursor-help items-center justify-center rounded-full border border-transparent p-0.5 text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border)] hover:text-[var(--color-text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]",
        className
      ].join(" ")}
      title={title}
      aria-label="How Sprint Health Score is calculated"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M12 17v-5h-.02"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="12" cy="8" r="1.25" fill="currentColor" />
      </svg>
    </button>
  );
}
