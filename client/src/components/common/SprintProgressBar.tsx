export function SprintProgressBar({
  donePoints,
  totalPoints,
  capacityTarget,
  showPercentLabel = true
}: {
  donePoints: number;
  totalPoints: number;
  capacityTarget: number | null;
  showPercentLabel?: boolean;
}) {
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const hasCapacityTarget = capacityTarget != null && capacityTarget > 0;
  const barScaleMax = Math.max(totalPoints, capacityTarget ?? 0, 1);
  const capacityTrackPct = hasCapacityTarget ? ((capacityTarget ?? 0) / barScaleMax) * 100 : 100;
  const donePctByScale = (donePoints / barScaleMax) * 100;
  const totalPctByScale = (totalPoints / barScaleMax) * 100;

  if (hasCapacityTarget) {
    return (
      <>
        <div className="relative mt-1 h-3 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <div
            className="absolute left-0 top-0 h-full border-r border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
            style={{ width: `${capacityTrackPct}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full bg-[var(--color-success)]"
            style={{ width: `${Math.min(donePctByScale, capacityTrackPct)}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full border border-[var(--color-accent)] opacity-40"
            style={{ width: `${Math.min(totalPctByScale, 100)}%` }}
          />
          {totalPoints > (capacityTarget ?? 0) ? (
            <div
              className="absolute top-[-2px] h-[calc(100%+4px)] w-[2px] bg-[var(--color-warning)]"
              style={{ left: `${capacityTrackPct}%` }}
            />
          ) : null}
        </div>
        <div className="mt-1 text-right text-xs text-[var(--color-text-muted)]">
          {donePoints} done · {totalPoints} planned · {capacityTarget} capacity
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-1 h-3 w-full border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {showPercentLabel ? (
        <div className="mt-1 text-right text-xs text-[var(--color-text-muted)]">{progressPct}%</div>
      ) : null}
    </>
  );
}
