// Developed by Sydney Edwards
import { useEffect, useMemo, useState } from "react";
import type { HealthScoreComponents, HealthScoreResult } from "@the-ruck/shared";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HealthScoreInfoIcon } from "../../../components/common/HealthScoreInfoIcon";

const COMPONENT_ORDER: (keyof HealthScoreComponents)[] = [
  "velocityAdherence",
  "scopeStability",
  "capacityAlignment",
  "teamAvailability",
  "retroHealth"
];

function gradeArcColor(grade: string): string {
  switch (grade) {
    case "A":
      return "var(--color-success)";
    case "B":
      return "color-mix(in srgb, var(--color-success) 72%, white)";
    case "C":
      return "var(--color-warning)";
    case "D":
      return "#f4a261";
    default:
      return "var(--color-danger)";
  }
}

function barTone(score: number, max: number): string {
  if (score >= max) return "bg-[var(--color-success)]";
  if (score >= max / 2) return "bg-[var(--color-warning)]";
  return "bg-[var(--color-danger)]";
}

function trendLabel(trend: HealthScoreResult["trend"]): { arrow: string; text: string } {
  switch (trend) {
    case "up":
      return { arrow: "↑", text: "Improving vs last sprint" };
    case "down":
      return { arrow: "↓", text: "Below last sprint" };
    case "stable":
      return { arrow: "→", text: "Similar to last sprint" };
    default:
      return { arrow: "—", text: "Not enough history to trend" };
  }
}

type HealthHistoryRow = {
  sprintId: string;
  name: string;
  total: number;
  grade: string;
  completedAt?: string;
};

export type SprintHealthApiPayload = {
  healthScore: HealthScoreResult;
  calculatedAt: string;
  history: HealthHistoryRow[];
};

type Props = {
  data: SprintHealthApiPayload | null;
  loading: boolean;
};

export function SprintHealthPanel({ data, loading }: Props) {
  const [gaugeReady, setGaugeReady] = useState(false);
  const total = data?.healthScore.total ?? 0;
  const grade = data?.healthScore.grade ?? "F";
  const arcColor = gradeArcColor(grade);

  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, total)) / 100;
  const dashTarget = `${pct * c} ${c}`;

  useEffect(() => {
    setGaugeReady(false);
    const id = requestAnimationFrame(() => setGaugeReady(true));
    return () => cancelAnimationFrame(id);
  }, [total, grade]);

  const sparkData = useMemo(() => {
    if (!data?.history?.length) return [];
    return data.history.map((h) => ({
      name: h.name.length > 10 ? `${h.name.slice(0, 10)}…` : h.name,
      total: h.total
    }));
  }, [data?.history]);

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading sprint health…</p>;
  }

  if (!data) {
    return <p className="text-sm text-[var(--color-text-muted)]">Could not load sprint health.</p>;
  }

  const { healthScore } = data;
  const trend = trendLabel(healthScore.trend);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-36 w-36">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={arcColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={gaugeReady ? dashTarget : `0 ${c}`}
              style={{
                transition: "stroke-dasharray 0.85s ease-out"
              }}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-4xl tabular-nums text-[var(--color-text-primary)]">
              {healthScore.total}
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{grade}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <p className="font-heading text-lg text-[var(--color-text-primary)]">Sprint Health Score</p>
          <HealthScoreInfoIcon className="translate-y-px" />
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-accent)]">{trend.arrow}</span> {trend.text}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Calculated {new Date(data.calculatedAt).toLocaleString()}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-xl text-[var(--color-text-primary)]">How we calculated this</h3>
        {COMPONENT_ORDER.map((key) => {
          const comp = healthScore.components[key];
          return (
            <div key={key} className="border-b border-[var(--color-border)] pb-3 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{comp.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--color-text-secondary)]">
                  {comp.score} / {comp.max}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-[var(--color-bg-tertiary)]">
                <div
                  className={`h-full rounded transition-all ${barTone(comp.score, comp.max)}`}
                  style={{ width: `${(comp.score / comp.max) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{comp.detail}</p>
            </div>
          );
        })}
      </div>

      {sparkData.length > 0 ? (
        <div>
          <h3 className="font-heading text-xl text-[var(--color-text-primary)]">Recent sprint scores</h3>
          <p className="text-xs text-[var(--color-text-muted)]">Last {sparkData.length} completed sprints (stored at completion)</p>
          <div className="mt-3 h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <XAxis dataKey="name" tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="var(--color-accent)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
