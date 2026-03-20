import { Card } from "../../../components/common/Card";

export function RetrosListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx} padding="md">
          <div className="animate-pulse">
            <div className="h-4 w-1/3 bg-[var(--color-bg-tertiary)]" />
            <div className="mt-2 h-3 w-2/3 bg-[var(--color-bg-tertiary)]" />
          </div>
        </Card>
      ))}
    </div>
  );
}
