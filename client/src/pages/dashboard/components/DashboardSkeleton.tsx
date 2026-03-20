export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[35%_40%_25%]">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="h-44 animate-pulse border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
      ))}
    </div>
  );
}
