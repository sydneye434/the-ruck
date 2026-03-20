// Developed by Sydney Edwards
import { Card } from "../../../components/common/Card";

export function SprintBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
      {["Backlog", "In Progress", "In Review", "Done"].map((name) => (
        <Card key={name} padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-28 animate-pulse bg-[var(--color-bg-tertiary)]" />
            <div className="h-5 w-14 animate-pulse bg-[var(--color-bg-tertiary)]" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
              <div className="h-4 w-16 animate-pulse bg-[var(--color-bg-tertiary)]" />
              <div className="mt-2 h-4 w-full animate-pulse bg-[var(--color-bg-tertiary)]" />
              <div className="mt-1 h-4 w-3/4 animate-pulse bg-[var(--color-bg-tertiary)]" />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

