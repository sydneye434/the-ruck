// Developed by Sydney Edwards
import { Link } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="That route does not exist in The Ruck."
      action={
        <Link
          to="/dashboard"
          className="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
        >
          Go to Dashboard
        </Link>
      }
    />
  );
}
