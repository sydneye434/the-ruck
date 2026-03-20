// Developed by Sydney Edwards
import { Card } from "../../../components/common/Card";

export function SprintsListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Card key={idx} padding="md">
          <div className="flex animate-pulse items-center justify-between gap-3">
            <div>
              <div className="h-4 w-40 bg-[var(--color-bg-tertiary)]" />
              <div className="mt-2 h-3 w-32 bg-[var(--color-bg-tertiary)]" />
            </div>
            <div className="h-8 w-24 bg-[var(--color-bg-tertiary)]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

