// Developed by Sydney Edwards
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type BurndownApiPayload = {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    capacityTarget: number | null;
  };
  snapshots: Array<{
    date: string;
    remainingPoints: number;
    completedPoints: number;
  }>;
  idealBurndown: Array<{ date: string; idealRemaining: number }>;
  projectedCompletion: {
    date: string | null;
    status: "on_track" | "at_risk" | "overdue" | null;
    daysDeltaVsEnd: number | null;
  };
  projectedLine: Array<{ date: string; remainingPoints: number }>;
};

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildRows(data: BurndownApiPayload, completed: boolean) {
  const idealMap = new Map(data.idealBurndown.map((x) => [x.date, x.idealRemaining]));
  const snapByDate = new Map(data.snapshots.map((s) => [s.date, s]));
  const dates = new Set<string>();
  idealMap.forEach((_v, k) => dates.add(k));
  snapByDate.forEach((_v, k) => dates.add(k));
  data.projectedLine.forEach((p) => dates.add(p.date));
  const sorted = [...dates].sort();
  const today = formatYmd(new Date());

  const projMap = new Map(data.projectedLine.map((p) => [p.date, p.remainingPoints]));

  return sorted.map((date) => {
    const ideal = idealMap.get(date) ?? null;
    const snap = snapByDate.get(date);
    const actual = snap?.remainingPoints ?? null;
    const ahead = ideal != null && actual != null ? Math.max(0, ideal - actual) : 0;
    const behind = ideal != null && actual != null ? Math.max(0, actual - ideal) : 0;
    const projected =
      !completed && projMap.has(date) ? (projMap.get(date) as number) : (null as number | null);
    return {
      date,
      ideal,
      actual,
      ahead,
      behind,
      projected,
      todayLabel: !completed && date === today ? "Today" : ""
    };
  });
}

function tooltipForRow(
  row: { date: string; ideal: number | null; actual: number | null },
  prevSnap: { completedPoints: number } | undefined,
  snap: { completedPoints: number } | undefined
) {
  const delta =
    prevSnap && snap ? Math.max(0, snap.completedPoints - prevSnap.completedPoints) : 0;
  return { deltaDone: delta };
}

type Props = {
  data: BurndownApiPayload;
  completed?: boolean;
  compact?: boolean;
  showBanner?: boolean;
};

export function SprintBurndownChart({ data, completed = false, compact = false, showBanner = true }: Props) {
  const rows = useMemo(() => buildRows(data, completed), [data, completed]);
  const sprintLong = useMemo(() => {
    const s = new Date(data.sprint.startDate);
    const e = new Date(data.sprint.endDate);
    const days = Math.ceil((e.getTime() - s.getTime()) / 86400000);
    return days > 14;
  }, [data.sprint.startDate, data.sprint.endDate]);

  const today = formatYmd(new Date());
  const capacity = data.sprint.capacityTarget;

  const banner = useMemo(() => {
    if (!showBanner) return null;
    const p = data.projectedCompletion;
    if (!p.status || p.date == null) {
      return (
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          Collecting data · Check back after a few days of activity
        </div>
      );
    }
    const d = new Date(p.date);
    const dStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const late = p.daysDeltaVsEnd ?? 0;
    if (p.status === "on_track") {
      const early = late < 0 ? Math.abs(late) : 0;
      return (
        <div
          className="rounded border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-status-on-track-border)",
            background: "var(--color-status-on-track-bg)",
            color: "var(--color-status-on-track-text)"
          }}
        >
          On track · Projected completion {dStr}
          {early > 0 ? ` (${early} day${early === 1 ? "" : "s"} early)` : ""}
        </div>
      );
    }
    if (p.status === "at_risk") {
      return (
        <div
          className="rounded border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-status-at-risk-border)",
            background: "var(--color-status-at-risk-bg)",
            color: "var(--color-status-at-risk-text)"
          }}
        >
          At risk · Projected completion {dStr} ({late} day{late === 1 ? "" : "s"} late)
        </div>
      );
    }
    return (
      <div
        className="rounded border px-3 py-2 text-sm"
        style={{
          borderColor: "var(--color-status-behind-border)",
          background: "var(--color-status-behind-bg)",
          color: "var(--color-status-behind-text)"
        }}
      >
        Behind schedule · At current pace, work may extend beyond the sprint end
      </div>
    );
  }, [data.projectedCompletion, showBanner]);

  return (
    <div className="space-y-3">
      {banner}
      <div style={{ width: "100%", height: compact ? 220 : 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: sprintLong ? 48 : 8 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T12:00:00");
                return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }}
              angle={sprintLong ? -45 : 0}
              textAnchor={sprintLong ? "end" : "middle"}
              height={sprintLong ? 56 : 28}
            />
            <YAxis
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              label={{ value: "Points remaining", angle: -90, position: "insideLeft", fill: "var(--color-text-muted)" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof rows)[0];
                const idx = data.snapshots.findIndex((s) => s.date === row.date);
                const prev = idx > 0 ? data.snapshots[idx - 1] : undefined;
                const snap = idx >= 0 ? data.snapshots[idx] : undefined;
                const { deltaDone } = tooltipForRow(row, prev, snap);
                const ideal = row.ideal;
                const actual = row.actual;
                return (
                  <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-primary)] shadow">
                    <div className="font-semibold">{row.date}</div>
                    {ideal != null ? <div>Ideal remaining: {ideal.toFixed(1)} pts</div> : null}
                    {actual != null ? <div>Actual remaining: {actual.toFixed(1)} pts</div> : null}
                    <div>Points completed today: {deltaDone.toFixed(1)} pts</div>
                  </div>
                );
              }}
            />
            <Legend />
            <Area
              dataKey="ahead"
              name="Ahead (ideal − actual)"
              fill="var(--color-chart-area-ahead)"
              stroke="none"
              connectNulls
            />
            <Area
              dataKey="behind"
              name="Behind (actual − ideal)"
              fill="var(--color-chart-area-behind)"
              stroke="none"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="var(--color-text-muted)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual remaining"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
            {!completed ? (
              <Line
                type="linear"
                dataKey="projected"
                name="Projected"
                stroke="var(--color-chart-projected)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            ) : null}
            {!completed && rows.some((r) => r.date === today) ? (
              <ReferenceLine
                x={today}
                stroke="var(--color-text-secondary)"
                strokeDasharray="4 4"
                label={{ value: "Today", position: "top", fill: "var(--color-text-muted)" }}
              />
            ) : null}
            {capacity != null && capacity > 0 ? (
              <ReferenceLine
                y={capacity}
                stroke="var(--color-chart-capacity)"
                strokeDasharray="4 4"
                label={{
                  value: "Capacity target",
                  position: "right",
                  fill: "var(--color-chart-capacity)"
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SprintBurndownStats({ velocity }: { velocity: number }) {
  return (
    <p className="text-sm text-[var(--color-text-secondary)]">
      Final velocity: <span className="font-semibold text-[var(--color-text-primary)]">{velocity} pts</span>
    </p>
  );
}
