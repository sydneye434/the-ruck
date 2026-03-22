// Developed by Sydney Edwards
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sprint, TeamMemberLink, TeamTreeNode, TeamWithDepth } from "@the-ruck/shared";
import { api, ApiClientError } from "../../../lib/api";
import {
  calculateAverageVelocity,
  calculateRecommendedCapacity,
  calculateTeamAvailability,
  calculateTrend,
  buildCapacitySnapshot,
  getConfidenceLevel,
  snapToFibonacci,
  getVelocityWindow
} from "../../../lib/velocityEngine";
import { Card } from "../../../components/common/Card";
import { EmptyState } from "../../../components/common/EmptyState";
import { Badge } from "../../../components/common/Badge";
import { Avatar } from "../../../components/common/Avatar";
import { buildTeamTree } from "../../../lib/buildTeamTree";
import { computeOverridePercent } from "../../../lib/capacityPlanningUtils";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/ToastProvider";
import { useSettings } from "../../../settings/SettingsContext";
import { useCountAnimation } from "../../../hooks/useCountAnimation";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";

type CapacityContextResponse = {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    capacityTarget: number | null;
    capacitySnapshot: unknown;
  };
  completedSprints: Array<{
    id: string;
    name: string;
    completedAt: string;
    velocityDataPoint: number;
  }>;
  activeMembers: Array<{
    id: string;
    name: string;
    roleType: "team_member" | "scrum_master" | "product_owner" | "coordinator";
    coordinatorTitle?: string;
    avatar: { color: string; initials: string };
    defaultAvailabilityDays: number;
    capacityMultiplier: number;
    effectiveDays: number;
  }>;
  teams: TeamWithDepth[];
  memberships: TeamMemberLink[];
  workingDaysInSprint: number;
};

type CapacityState = {
  velocityWindow: 1 | 2 | 3 | 5;
  windowedSprints: CapacityContextResponse["completedSprints"];
  averageVelocity: number | null;
  trend: "up" | "down" | "flat" | "insufficient_data" | null;
  confidenceLevel: "high" | "medium" | "low" | "none" | null;
  daysOffMap: Record<string, number>;
  teamAvailability: ReturnType<typeof calculateTeamAvailability> | null;
  recommendedCapacity: number | null;
  fibSnapped: number | null;
  useSnap: boolean;
  manualOverride: number | null;
  finalCapacityTarget: number | null;
};

type SavedCapacitySnapshot = {
  velocityWindow?: 1 | 2 | 3 | 5;
  averageVelocity?: number | null;
  teamAvailabilityRatio?: number;
  memberBreakdown?: Array<{
    memberId: string;
    effectiveDays: number;
    daysOff: number;
    availableDays: number;
    availabilityPercent: number;
  }>;
  recommendedCapacity?: number | null;
  finalCapacityTarget?: number | null;
  fibonacciSnapped?: boolean;
  calculatedAt?: string;
};

type TeamGroup = {
  id: string;
  name: string;
  color: string;
  depth: number;
  memberIds: string[];
  hasChildren: boolean;
};

type GroupedRows = {
  groups: TeamGroup[];
  unassigned: string[];
};

const INITIAL_CAPACITY_STATE: CapacityState = {
  velocityWindow: 3,
  windowedSprints: [],
  averageVelocity: null,
  trend: null,
  confidenceLevel: null,
  daysOffMap: {},
  teamAvailability: null,
  recommendedCapacity: null,
  fibSnapped: null,
  useSnap: true,
  manualOverride: null,
  finalCapacityTarget: null
};

function formatDateRange(startDate: string, endDate: string) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  )}`;
}

function roleBadge(member: CapacityContextResponse["activeMembers"][number]) {
  if (member.roleType === "coordinator") return { label: member.coordinatorTitle || "Coordinator", color: "coordinator" as const };
  if (member.roleType === "scrum_master") return { label: "Scrum Master", color: "accent" as const };
  if (member.roleType === "product_owner") return { label: "Product Owner", color: "product" as const };
  return { label: "Team Member", color: "default" as const };
}

function availabilityToneKey(availableDays: number, effectiveDays: number): "success" | "warning" | "danger" {
  if (availableDays <= 0) return "danger";
  if (availableDays < effectiveDays) return "warning";
  return "success";
}

const MINI_BAR_GRADIENT: Record<"success" | "warning" | "danger", string> = {
  success: "linear-gradient(to right, var(--color-success), color-mix(in srgb, var(--color-success) 72%, white))",
  warning: "linear-gradient(to right, var(--color-warning), color-mix(in srgb, var(--color-warning) 72%, white))",
  danger: "linear-gradient(to right, var(--color-danger), color-mix(in srgb, var(--color-danger) 72%, white))"
};

const TONE_COLOR: Record<"success" | "warning" | "danger", string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)"
};

function DaysOffStepper({
  value,
  max,
  onChange,
  onFocus,
  onBlur
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clearRepeat = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  }, []);

  const step = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(max, value + delta));
      onChange(next);
    },
    [max, onChange, value]
  );

  const startHold = useCallback(
    (delta: number) => {
      clearRepeat();
      holdTimer.current = setTimeout(() => {
        repeatTimer.current = setInterval(() => step(delta), 100);
      }, 500);
    },
    [clearRepeat, step]
  );

  useEffect(() => () => clearRepeat(), [clearRepeat]);

  const stepperTint =
    value > 0 && value < max
      ? "capacity-days-stepper--amber"
      : value >= max && max > 0
        ? "capacity-days-stepper--danger"
        : "";

  return (
    <div className={`capacity-days-stepper ${stepperTint}`}>
      <button
        type="button"
        aria-label="Decrease days off"
        disabled={value <= 0}
        className="flex h-9 w-9 shrink-0 items-center justify-center border-r border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        onPointerDown={() => startHold(-1)}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onClick={() => step(-1)}
      >
        <span className="text-lg leading-none">−</span>
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Days off"
        className="min-w-0 flex-1 bg-transparent px-1 text-center font-mono text-lg font-semibold tabular-nums text-[var(--color-text-primary)] outline-none"
        value={draft}
        onFocus={onFocus}
        onBlur={() => {
          onBlur?.();
          const n = Number.parseInt(draft.replace(/\D/g, ""), 10);
          if (!Number.isFinite(n)) {
            setDraft(String(value));
            return;
          }
          onChange(Math.max(0, Math.min(max, n)));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          setDraft(raw);
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (Number.isFinite(n)) onChange(Math.max(0, Math.min(max, n)));
        }}
      />
      <button
        type="button"
        aria-label="Increase days off"
        disabled={value >= max}
        className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        onPointerDown={() => startHold(1)}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onClick={() => step(1)}
      >
        <span className="text-lg leading-none">+</span>
      </button>
    </div>
  );
}

const MemberAvailabilityRow = memo(function MemberAvailabilityRow({
  member,
  breakdown,
  onDaysOffChange
}: {
  member: CapacityContextResponse["activeMembers"][number];
  breakdown: { effectiveDays: number; daysOff: number; availableDays: number };
  onDaysOffChange: (memberId: string, value: number) => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const badge = roleBadge(member);
  const maxDaysOff = Math.max(0, Math.floor(member.effectiveDays));
  const barRatio = member.effectiveDays > 0 ? Math.max(0, Math.min(1, breakdown.availableDays / member.effectiveDays)) : 0;
  const toneKey = availabilityToneKey(breakdown.availableDays, member.effectiveDays);
  const [focused, setFocused] = useState(false);
  const prevRatio = useRef(barRatio);
  const hasPulsed = useRef(false);
  const [pulse, setPulse] = useState(false);

  const animatedAvail = useCountAnimation(breakdown.availableDays, 300, reducedMotion);

  useEffect(() => {
    if (prevRatio.current >= 0.5 && barRatio < 0.5 && !hasPulsed.current) {
      hasPulsed.current = true;
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 450);
      return () => clearTimeout(t);
    }
    prevRatio.current = barRatio;
  }, [barRatio]);

  const displayAvail = animatedAvail != null ? Math.round(animatedAvail) : breakdown.availableDays;

  return (
    <div
      className={[
        "capacity-member-row grid grid-cols-[minmax(180px,1fr)_88px_148px_72px_88px] items-center gap-3 border-b border-[var(--color-border)] py-2 pl-1",
        focused ? "capacity-member-row--focus" : ""
      ].join(" ")}
    >
      <div className="flex min-h-[3rem] items-center gap-2">
        <Avatar name={member.name} color={member.avatar.color} size="sm" />
        <div className="min-w-0 flex flex-col justify-center">
          <p className="truncate text-sm font-semibold leading-tight text-[var(--color-text-primary)]">{member.name}</p>
          <div className="mt-0.5 flex items-center">
            <Badge label={badge.label} color={badge.color} />
          </div>
        </div>
      </div>

      <p
        className="text-xs leading-none text-[var(--color-text-muted)]"
        title={`${member.defaultAvailabilityDays} days × ${member.capacityMultiplier}% capacity = ${member.effectiveDays} effective days`}
      >
        {member.effectiveDays} days
      </p>

      <div className="flex min-h-[3rem] items-center">
        <DaysOffStepper
          value={breakdown.daysOff}
          max={maxDaysOff}
          onChange={(v) => onDaysOffChange(member.id, v)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      <p
        className={`capacity-available-days text-sm font-semibold ${toneKey === "success" ? "text-[var(--color-success)]" : toneKey === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"}`}
      >
        {displayAvail} days
      </p>

      <div className="h-2 w-[5.5rem] shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <div
          className={`capacity-mini-bar-fill h-full rounded-sm will-change-[width] ${pulse ? "capacity-mini-bar-fill--pulse" : ""}`}
          style={{
            width: `${Math.round(barRatio * 100)}%`,
            background: MINI_BAR_GRADIENT[toneKey],
            transformOrigin: "left center"
          }}
        />
      </div>
    </div>
  );
});

function TeamRatioRing({ ratio, animatedPct, tone }: { ratio: number; animatedPct: number | null; tone: "success" | "warning" | "danger" }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const t = Math.max(0, Math.min(1, ratio));
  const offset = c * (1 - t);
  const color = TONE_COLOR[tone];
  const label = `${animatedPct != null ? animatedPct : Math.round(ratio * 100)}%`;
  return (
    <div className="relative h-[52px] w-[52px] shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <circle
          className="capacity-ratio-ring"
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-heading text-[13px] text-[var(--color-text-primary)]">
        {label}
      </span>
    </div>
  );
}

function VelocitySparkline({
  velocities,
  trend,
  sparkPhase,
  windowKey
}: {
  velocities: number[];
  trend: "up" | "down" | "flat" | "insufficient_data" | null;
  sparkPhase: "idle" | "exit" | "enter";
  windowKey: number;
}) {
  const w = 120;
  const h = 40;
  const pad = 4;
  const [enterSettled, setEnterSettled] = useState(true);

  useEffect(() => {
    if (sparkPhase === "enter") {
      setEnterSettled(false);
      const id = window.setTimeout(() => setEnterSettled(true), 30);
      return () => clearTimeout(id);
    }
    setEnterSettled(true);
  }, [sparkPhase, windowKey]);

  if (velocities.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-xs text-[var(--color-text-muted)]">—</p>
      </div>
    );
  }
  const maxV = Math.max(...velocities, 1);
  const minV = Math.min(...velocities, 0);
  const range = Math.max(maxV - minV, 1);
  const pts = velocities.map((v, i) => {
    const x = pad + (i / Math.max(velocities.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - minV) / range) * (h - pad * 2);
    return { x, y, v, i };
  });
  const lineColor =
    trend === "up" ? "var(--color-success)" : trend === "down" ? "var(--color-danger)" : "var(--color-text-muted)";
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

  const trendLabel =
    trend === "up" ? "↑ Trending up" : trend === "down" ? "↓ Trending down" : trend === "flat" ? "— Stable" : "—";

  return (
    <div className="mt-2 w-[120px]" key={windowKey}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {pts.length >= 2 ? (
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polyline}
          />
        ) : null}
        {pts.map((p, idx) => {
          const isLast = idx === pts.length - 1;
          const stagger = idx * 50;
          const exitCls = sparkPhase === "exit" ? "capacity-spark-dot--exit" : "";
          const enterCls =
            sparkPhase === "enter" && !enterSettled ? "capacity-spark-dot--enter" : "";
          const pulseCls = isLast && sparkPhase === "idle" ? "capacity-spark-dot--pulse" : "";
          const cls = ["capacity-spark-dot", exitCls, enterCls, pulseCls].filter(Boolean).join(" ");
          return (
            <circle
              key={`${idx}`}
              cx={p.x}
              cy={p.y}
              r={isLast ? 4.5 : 3}
              fill={lineColor}
              className={cls}
              style={{ transitionDelay: `${stagger}ms` }}
            />
          );
        })}
      </svg>
      <p className="mt-1 text-xs" style={{ color: lineColor }}>
        {trendLabel}
      </p>
    </div>
  );
}

function ConfidenceBadgeDisplay({
  level,
  sprintCount
}: {
  level: "high" | "medium" | "low" | "none" | null;
  sprintCount: number;
}) {
  const n = sprintCount;
  if (level === "high") {
    return (
      <span
        className="capacity-confidence-badge inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]"
        style={{ background: "color-mix(in srgb, var(--color-success) 35%, var(--color-bg-tertiary))" }}
        title={`Based on ${n} completed sprints — high reliability`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-[var(--color-success)]">
          <path
            d="M2.5 6.2l2.4 2.4L9.5 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        High confidence
      </span>
    );
  }
  if (level === "medium") {
    return (
      <span
        className="capacity-confidence-badge inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]"
        style={{ background: "color-mix(in srgb, var(--color-warning) 35%, var(--color-bg-tertiary))" }}
        title={`Based on ${n} sprints — more data will improve accuracy`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-[var(--color-warning)]">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 8.2v.1M6 3.8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Medium confidence
      </span>
    );
  }
  if (level === "low") {
    return (
      <span
        className="capacity-confidence-badge inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[var(--color-text-primary)]"
        style={{ background: "color-mix(in srgb, var(--color-danger) 28%, var(--color-bg-tertiary))" }}
        title={`Only ${n} sprint available — treat this as a rough guide`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-[var(--color-danger)]">
          <path fill="currentColor" d="M6 1L11 10H1z" opacity="0.9" />
          <path stroke="var(--color-bg-primary)" strokeWidth="1" d="M6 4v4" />
        </svg>
        Low confidence
      </span>
    );
  }
  return (
    <span
      className="capacity-confidence-badge inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
      title="No completed sprints yet — set a manual target below"
    >
      <span className="font-mono">—</span>
      No data yet
    </span>
  );
}

export function CapacityPlanningPanel({
  sprint,
  open,
  onClose,
  onSaved
}: {
  sprint: Sprint | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const { settings, formatDate } = useSettings();
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const [loading, setLoading] = useState(false);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<CapacityContextResponse | null>(null);
  const [capacityState, setCapacityState] = useState<CapacityState>(INITIAL_CAPACITY_STATE);

  const frozenSprintRef = useRef<Sprint | null>(null);
  if (sprint) frozenSprintRef.current = sprint;
  const displaySprint = sprint ?? frozenSprintRef.current;

  const [isClosing, setIsClosing] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  const beginClose = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  }, [onClose]);

  useEffect(() => {
    if (open && !isClosing) {
      const id = requestAnimationFrame(() => setSlideIn(true));
      return () => cancelAnimationFrame(id);
    }
    if (!open) setSlideIn(false);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open && !isClosing) frozenSprintRef.current = null;
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") beginClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, beginClose]);

  async function loadContext() {
    if (!sprint) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await api.sprints.getCapacityContext(sprint.id)) as CapacityContextResponse;
      const snapshot = (res.sprint.capacitySnapshot ?? null) as SavedCapacitySnapshot | null;
      const initialWindow: 1 | 2 | 3 | 5 =
        snapshot?.velocityWindow && [1, 2, 3, 5].includes(snapshot.velocityWindow)
          ? snapshot.velocityWindow
          : ((settings?.velocityWindow ?? INITIAL_CAPACITY_STATE.velocityWindow) as 1 | 2 | 3 | 5);
      const daysOffMap = (snapshot?.memberBreakdown ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.memberId] = Number.isFinite(row.daysOff) ? row.daysOff : 0;
        return acc;
      }, {});
      const baselineAvailability = calculateTeamAvailability(res.activeMembers, daysOffMap);
      const initialAverage = calculateAverageVelocity(getVelocityWindow(res.completedSprints, initialWindow));
      const initialRecommended = calculateRecommendedCapacity(
        initialAverage,
        baselineAvailability.teamAvailabilityRatio
      );
      const inferredOverride =
        snapshot?.finalCapacityTarget != null &&
        initialRecommended != null &&
        Math.round(snapshot.finalCapacityTarget) !== Math.round(initialRecommended)
          ? Math.round(snapshot.finalCapacityTarget)
          : null;

      setContext(res);
      setCapacityState({
        ...INITIAL_CAPACITY_STATE,
        velocityWindow: initialWindow,
        daysOffMap,
        useSnap: snapshot?.fibonacciSnapped ?? true,
        manualOverride: inferredOverride,
        confidenceLevel: getConfidenceLevel(res.completedSprints.length),
        teamAvailability: baselineAvailability,
        averageVelocity: initialAverage,
        recommendedCapacity: initialRecommended,
        fibSnapped: initialRecommended == null ? null : snapToFibonacci(initialRecommended),
        finalCapacityTarget:
          inferredOverride ??
          (snapshot?.fibonacciSnapped ?? true
            ? snapToFibonacci(initialRecommended)
            : initialRecommended == null
              ? null
              : Math.round(initialRecommended))
      });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load capacity context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !sprint) return;
    setContext(null);
    setCapacityState({ ...INITIAL_CAPACITY_STATE, velocityWindow: (settings?.velocityWindow ?? 3) as 1 | 2 | 3 | 5 });
    loadContext();
  }, [open, sprint?.id, settings?.velocityWindow]);

  const velocityDerived = useMemo(() => {
    if (!context) {
      return {
        windowedSprints: [] as CapacityContextResponse["completedSprints"],
        averageVelocity: null as number | null,
        trend: "insufficient_data" as const
      };
    }
    const windowedSprints = getVelocityWindow(context.completedSprints, capacityState.velocityWindow);
    const averageVelocity = calculateAverageVelocity(windowedSprints);
    const trend = calculateTrend(windowedSprints);
    return { windowedSprints, averageVelocity, trend };
  }, [context, capacityState.velocityWindow]);

  useEffect(() => {
    setCapacityState((prev) => ({
      ...prev,
      windowedSprints: velocityDerived.windowedSprints,
      averageVelocity: velocityDerived.averageVelocity,
      trend: velocityDerived.trend,
      confidenceLevel: context ? getConfidenceLevel(context.completedSprints.length) : null
    }));
  }, [velocityDerived.windowedSprints, velocityDerived.averageVelocity, velocityDerived.trend, context]);

  useEffect(() => {
    setCapacityState((prev) => {
      const ratio = prev.teamAvailability?.teamAvailabilityRatio ?? null;
      const recommendedCapacity = calculateRecommendedCapacity(prev.averageVelocity, ratio);
      const fibSnapped = recommendedCapacity == null ? null : snapToFibonacci(recommendedCapacity);
      const finalCapacityTarget =
        prev.manualOverride != null
          ? prev.manualOverride
          : prev.useSnap
            ? fibSnapped
            : recommendedCapacity == null
              ? null
              : Math.round(recommendedCapacity);
      return {
        ...prev,
        recommendedCapacity,
        fibSnapped,
        finalCapacityTarget
      };
    });
  }, [capacityState.averageVelocity, capacityState.teamAvailability?.teamAvailabilityRatio, capacityState.useSnap, capacityState.manualOverride]);

  const teamTree = useMemo(() => (context ? buildTeamTree(context.teams) : []), [context]);
  const memberIdsByTeam = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!context) return map;
    context.memberships.forEach((link) => {
      const list = map.get(link.teamId) ?? [];
      list.push(link.memberId);
      map.set(link.teamId, list);
    });
    return map;
  }, [context]);

  const membersById = useMemo(() => {
    const map = new Map<string, CapacityContextResponse["activeMembers"][number]>();
    (context?.activeMembers ?? []).forEach((member) => map.set(member.id, member));
    return map;
  }, [context]);

  const groupedRows = useMemo<GroupedRows>(() => {
    if (!context) return { groups: [], unassigned: [] };
    const assigned = new Set<string>();
    const groups: TeamGroup[] = [];

    const walk = (nodes: TeamTreeNode[]) => {
      nodes.forEach((team) => {
        const memberIds = (memberIdsByTeam.get(team.id) ?? []).filter((id) => membersById.has(id));
        memberIds.forEach((id) => assigned.add(id));
        groups.push({
          id: team.id,
          name: team.name,
          color: team.color,
          depth: team.depth,
          memberIds,
          hasChildren: team.children.length > 0
        });
        walk(team.children);
      });
    };
    walk(teamTree);

    const unassigned = context.activeMembers.map((m) => m.id).filter((id) => !assigned.has(id));

    return { groups, unassigned };
  }, [context, memberIdsByTeam, membersById, teamTree]);

  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setCollapsedTeams({});
  }, [sprint?.id, open]);

  const onDaysOffChange = useCallback((memberId: string, value: number) => {
    setCapacityState((prev) => {
      const daysOffMap = { ...prev.daysOffMap, [memberId]: value };
      const teamAvailability = context
        ? calculateTeamAvailability(context.activeMembers, daysOffMap)
        : prev.teamAvailability;
      return {
        ...prev,
        daysOffMap,
        teamAvailability
      };
    });
  }, [context]);

  const setManualOverride = useCallback((value: string) => {
    setCapacityState((prev) => {
      if (!value.trim()) return { ...prev, manualOverride: null };
      const parsed = Math.max(1, Math.round(Number(value)));
      if (!Number.isFinite(parsed)) return { ...prev, manualOverride: null };
      return { ...prev, manualOverride: parsed };
    });
  }, []);

  async function saveCapacityPlan() {
    if (!sprint || !context || !capacityState.teamAvailability || capacityState.finalCapacityTarget == null) return;
    setSavePhase("saving");
    try {
      const capacitySnapshot = buildCapacitySnapshot({
        velocityWindow: capacityState.velocityWindow,
        averageVelocity: capacityState.averageVelocity,
        teamAvailabilityRatio: capacityState.teamAvailability.teamAvailabilityRatio,
        memberBreakdown: capacityState.teamAvailability.memberBreakdown,
        recommendedCapacity: capacityState.recommendedCapacity,
        finalCapacityTarget: capacityState.finalCapacityTarget,
        fibonacciSnapped: capacityState.useSnap
      });

      await api.sprints.update(sprint.id, {
        capacityTarget: capacityState.finalCapacityTarget,
        capacitySnapshot
      });
      toast.success("Capacity plan saved");
      if (onSaved) await onSaved();
      setSavePhase("success");
      window.setTimeout(() => {
        beginClose();
        window.setTimeout(() => setSavePhase("idle"), 300);
      }, 400);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Failed to save capacity plan.");
      setSavePhase("idle");
    }
  }

  const [sparkPhase, setSparkPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [sparkKey, setSparkKey] = useState(0);
  const prevWindow = useRef(capacityState.velocityWindow);

  useEffect(() => {
    if (prevWindow.current !== capacityState.velocityWindow) {
      setSparkPhase("exit");
      window.setTimeout(() => {
        setSparkKey((k) => k + 1);
        setSparkPhase("enter");
        window.setTimeout(() => setSparkPhase("idle"), 220);
      }, 150);
      prevWindow.current = capacityState.velocityWindow;
    }
  }, [capacityState.velocityWindow]);

  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    setBarsReady(false);
    const id = requestAnimationFrame(() => setBarsReady(true));
    return () => cancelAnimationFrame(id);
  }, [capacityState.velocityWindow, context?.sprint.id]);

  const prevReceipt = useRef<{ av: number | null; ratio: number | null; rec: number | null }>({
    av: null,
    ratio: null,
    rec: null
  });
  const receiptInit = useRef(true);
  useEffect(() => {
    receiptInit.current = true;
  }, [sprint?.id, open]);

  const [flashV, setFlashV] = useState(false);
  const [flashR, setFlashR] = useState(false);
  const [flashRec, setFlashRec] = useState(false);

  const ratioNum = capacityState.teamAvailability?.teamAvailabilityRatio ?? 0;
  const availabilityPct = Math.round(ratioNum * 100);
  const recommended = capacityState.recommendedCapacity;

  const animatedTeamPct = useCountAnimation(availabilityPct, 300, reducedMotion);
  const animatedFinalCap = useCountAnimation(capacityState.finalCapacityTarget, 400, reducedMotion);
  const animatedRecReceipt = useCountAnimation(recommended, 400, reducedMotion);

  useEffect(() => {
    const av = capacityState.averageVelocity;
    const ratio = ratioNum;
    const rec = recommended;
    const p = prevReceipt.current;
    const timers: number[] = [];

    if (receiptInit.current) {
      receiptInit.current = false;
      prevReceipt.current = { av, ratio, rec };
      return;
    }

    if (p.av !== av) {
      timers.push(window.setTimeout(() => setFlashV(true), 0));
      timers.push(window.setTimeout(() => setFlashV(false), 600));
    }
    if (p.ratio !== ratio) {
      timers.push(window.setTimeout(() => setFlashR(true), 100));
      timers.push(window.setTimeout(() => setFlashR(false), 700));
    }
    if (p.rec !== rec) {
      timers.push(window.setTimeout(() => setFlashRec(true), 200));
      timers.push(window.setTimeout(() => setFlashRec(false), 800));
    }
    prevReceipt.current = { av, ratio, rec };
    return () => timers.forEach(clearTimeout);
  }, [capacityState.averageVelocity, ratioNum, recommended]);

  const prevSnapRef = useRef<boolean | null>(null);
  const [snapAnim, setSnapAnim] = useState<"idle" | "toOn" | "toOff">("idle");

  useEffect(() => {
    if (!context) return;
    if (prevSnapRef.current === null) {
      prevSnapRef.current = capacityState.useSnap;
      return;
    }
    if (prevSnapRef.current === capacityState.useSnap) return;
    setSnapAnim(capacityState.useSnap ? "toOn" : "toOff");
    const t = window.setTimeout(() => setSnapAnim("idle"), 320);
    prevSnapRef.current = capacityState.useSnap;
    return () => clearTimeout(t);
  }, [capacityState.useSnap, context]);

  useEffect(() => {
    prevSnapRef.current = null;
  }, [context?.sprint.id]);

  const override = computeOverridePercent(capacityState.manualOverride, recommended);
  const warnVisible = override != null && (override > 20 || override < -40);
  const warnWasVisible = useRef(false);
  const [warnShake, setWarnShake] = useState(false);

  useEffect(() => {
    if (warnVisible && !warnWasVisible.current) {
      setWarnShake(true);
      window.setTimeout(() => setWarnShake(false), 320);
    }
    warnWasVisible.current = warnVisible;
  }, [warnVisible]);

  const showPanel = (open || isClosing) && displaySprint;
  if (!showPanel || !displaySprint) return null;

  const maxVelocity = Math.max(...(capacityState.windowedSprints.map((s) => s.velocityDataPoint) || [1]), 1);
  const selectedWindow = capacityState.velocityWindow;
  const actualWindow = capacityState.windowedSprints.length;
  const windowNote = actualWindow < selectedWindow;

  const savedSnapshot = (context?.sprint.capacitySnapshot ?? null) as SavedCapacitySnapshot | null;
  const savedCalculatedAt = savedSnapshot?.calculatedAt ? formatDate(savedSnapshot.calculatedAt) : null;

  const teamRatio = capacityState.teamAvailability?.teamAvailabilityRatio ?? 0;
  const ringTone: "success" | "warning" | "danger" =
    teamRatio >= 0.9 ? "success" : teamRatio >= 0.7 ? "warning" : "danger";

  const sparkVelocities = [...capacityState.windowedSprints].reverse().map((s) => s.velocityDataPoint);

  const rawNear = recommended != null && capacityState.fibSnapped != null && Math.round(recommended * 10) !== Math.round(capacityState.fibSnapped * 10);

  const asideClass = [
    "capacity-panel-aside fixed right-0 top-0 z-[81] flex h-full w-[92vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-primary)] will-change-transform",
    slideIn && !isClosing ? "translate-x-0" : "translate-x-full",
    isClosing ? "capacity-panel-aside--closing" : ""
  ].join(" ");

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        onClick={beginClose}
        className={[
          "capacity-panel-backdrop absolute inset-0 bg-black",
          slideIn && !isClosing ? "opacity-60" : "opacity-0"
        ].join(" ")}
        aria-label="Close panel"
      />

      <aside className={asideClass}>
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="font-heading text-4xl text-[var(--color-text-primary)]">
            Capacity Planning - {displaySprint.name}
          </h2>
          <button
            type="button"
            onClick={beginClose}
            className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            X
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[30%_auto_40%_auto_30%] gap-0 overflow-hidden">
          <section className="capacity-panel-col capacity-panel-col--1 min-h-0 overflow-y-auto p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Velocity History</h3>

            {loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} padding="sm">
                    <div className="animate-pulse">
                      <div className="h-4 w-1/2 bg-[var(--color-bg-tertiary)]" />
                      <div className="mt-2 h-3 w-2/3 bg-[var(--color-bg-tertiary)]" />
                      <div className="mt-2 h-2 w-full bg-[var(--color-bg-tertiary)]" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <EmptyState
                title="Could not load capacity context"
                description={error}
                action={
                  <button
                    type="button"
                    onClick={loadContext}
                    className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!loading && !error && context ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Average over last</p>
                  <div className="mt-2 inline-flex border border-[var(--color-border)]">
                    {[1, 2, 3, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCapacityState((prev) => ({ ...prev, velocityWindow: n as 1 | 2 | 3 | 5 }))}
                        className={[
                          "px-3 py-1.5 text-sm transition-colors",
                          capacityState.velocityWindow === n
                            ? "bg-[var(--color-accent)] text-[var(--color-text-primary)]"
                            : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
                        ].join(" ")}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {capacityState.windowedSprints.map((s, idx) => {
                    const widthPct = Math.round((s.velocityDataPoint / maxVelocity) * 100);
                    return (
                      <div
                        key={s.id}
                        className="group border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 transition-[filter] duration-150 hover:brightness-[1.05]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {formatDateRange(s.completedAt, s.completedAt)}
                            </p>
                          </div>
                          <p className="font-heading text-3xl text-[var(--color-text-primary)] transition-transform duration-150 group-hover:scale-105">
                            {s.velocityDataPoint}
                          </p>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                          <div
                            className="capacity-velocity-bar h-full rounded-sm bg-[var(--color-accent)]"
                            style={{
                              width: barsReady ? `${widthPct}%` : "0%",
                              transitionDelay: `${idx * 80}ms`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {windowNote ? (
                  <p className="text-xs text-[var(--color-warning)]">
                    Showing {actualWindow} sprint{actualWindow === 1 ? "" : "s"} - not enough data for a{" "}
                    {selectedWindow}-sprint average
                  </p>
                ) : null}

                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Average Velocity</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="font-heading text-4xl text-[var(--color-text-primary)]">
                      {capacityState.averageVelocity ?? "-"}
                      <span className="ml-1 text-base text-[var(--color-text-muted)]">pts</span>
                    </p>
                    <VelocitySparkline
                      velocities={sparkVelocities}
                      trend={capacityState.trend}
                      sparkPhase={sparkPhase}
                      windowKey={sparkKey}
                    />
                  </div>

                  <div className="mt-2">
                    <ConfidenceBadgeDisplay level={capacityState.confidenceLevel} sprintCount={context.completedSprints.length} />
                  </div>

                  {capacityState.confidenceLevel === "none" ? (
                    <div className="mt-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                      No completed sprints found. You can still set a manual capacity target in the recommendation panel.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <div className="capacity-column-divider" aria-hidden />

          <section className="capacity-panel-col capacity-panel-col--2 min-h-0 overflow-y-auto p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Team Availability</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Adjust for planned days off this sprint</p>

            {loading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Card key={idx} padding="sm">
                    <div className="h-10 animate-pulse bg-[var(--color-bg-tertiary)]" />
                  </Card>
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <EmptyState
                title="Could not load team availability"
                description={error}
                action={
                  <button
                    type="button"
                    onClick={loadContext}
                    className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  >
                    Retry
                  </button>
                }
              />
            ) : null}

            {!loading && !error && context ? (
              <div className="mt-4 flex h-[calc(100%-58px)] min-h-0 flex-col">
                <div className="mb-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{formatDateRange(context.sprint.startDate, context.sprint.endDate)}</span>
                  <span className="mx-2 text-[var(--color-text-muted)]">•</span>
                  <span>{context.workingDaysInSprint} working days</span>
                </div>

                {context.activeMembers.length === 0 ? (
                  <EmptyState
                    title="No active members"
                    description="Add active team members to calculate sprint availability."
                  />
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 pb-3">
                      {groupedRows.groups.map((group) => {
                        const collapsed = collapsedTeams[group.id] ?? false;
                        const sectionBreakdown = (capacityState.teamAvailability?.memberBreakdown ?? []).filter((b) =>
                          group.memberIds.includes(b.memberId)
                        );
                        const sectionEffective = sectionBreakdown.reduce((a, b) => a + b.effectiveDays, 0);
                        const sectionDaysOff = sectionBreakdown.reduce((a, b) => a + b.daysOff, 0);
                        const sectionAvailable = sectionBreakdown.reduce((a, b) => a + b.availableDays, 0);
                        return (
                          <div key={group.id} className="mt-3">
                            <button
                              type="button"
                              onClick={() => setCollapsedTeams((prev) => ({ ...prev, [group.id]: !collapsed }))}
                              className="flex w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2"
                              style={{ marginLeft: `${group.depth * 10}px` }}
                            >
                              <span className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                                {group.name}
                                <span className="text-xs text-[var(--color-text-muted)]">({group.memberIds.length})</span>
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">{collapsed ? "▸" : "▾"}</span>
                            </button>

                            {!collapsed ? (
                              <div style={{ marginLeft: `${group.depth * 10}px` }}>
                                {group.memberIds.map((memberId) => {
                                  const member = membersById.get(memberId);
                                  if (!member) return null;
                                  if (member.effectiveDays <= 0) {
                                    return (
                                      <div
                                        key={member.id}
                                        className="grid grid-cols-[1fr_auto] items-center border-b border-[var(--color-border)] py-2 text-sm text-[var(--color-text-muted)]"
                                      >
                                        <span>{member.name}</span>
                                        <span>Not available</span>
                                      </div>
                                    );
                                  }
                                  const b =
                                    capacityState.teamAvailability?.memberBreakdown.find((x) => x.memberId === member.id) ??
                                    {
                                      effectiveDays: member.effectiveDays,
                                      daysOff: 0,
                                      availableDays: member.effectiveDays
                                    };
                                  return (
                                    <MemberAvailabilityRow
                                      key={member.id}
                                      member={member}
                                      breakdown={b}
                                      onDaysOffChange={onDaysOffChange}
                                    />
                                  );
                                })}
                                <div className="mt-1 flex items-center justify-end gap-4 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
                                  <span>Effective: {sectionEffective.toFixed(1)}</span>
                                  <span>Days off: {sectionDaysOff.toFixed(1)}</span>
                                  <span>Available: {sectionAvailable.toFixed(1)}</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                      {groupedRows.unassigned.length > 0 ? (
                        <div className="mt-4">
                          <div className="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                            Unassigned ({groupedRows.unassigned.length})
                          </div>
                          {groupedRows.unassigned.map((memberId) => {
                            const member = membersById.get(memberId);
                            if (!member || member.effectiveDays <= 0) return null;
                            const b =
                              capacityState.teamAvailability?.memberBreakdown.find((x) => x.memberId === member.id) ??
                              {
                                effectiveDays: member.effectiveDays,
                                daysOff: 0,
                                availableDays: member.effectiveDays
                              };
                            return (
                              <MemberAvailabilityRow
                                key={member.id}
                                member={member}
                                breakdown={b}
                                onDaysOffChange={onDaysOffChange}
                              />
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="capacity-team-total-row mt-2 shrink-0 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--color-text-primary)]">Team Total</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                          <span>Effective: {capacityState.teamAvailability?.totalEffectiveDays.toFixed(1) ?? "0.0"}</span>
                          <span>Days off: {capacityState.teamAvailability?.totalDaysOff.toFixed(1) ?? "0.0"}</span>
                          <span>Available: {capacityState.teamAvailability?.totalAvailableDays.toFixed(1) ?? "0.0"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TeamRatioRing
                            ratio={teamRatio}
                            animatedPct={animatedTeamPct != null ? Math.round(animatedTeamPct) : null}
                            tone={ringTone}
                          />
                        </div>
                      </div>
                    </div>

                    {(capacityState.teamAvailability?.totalAvailableDays ?? 0) <= 0 ? (
                      <div className="mt-2 border border-[var(--color-danger)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-danger)]">
                        No team availability — check days off entries
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>

          <div className="capacity-column-divider" aria-hidden />

          <section className="capacity-panel-col capacity-panel-col--3 min-h-0 overflow-y-auto p-5">
            <h3 className="font-heading text-2xl text-[var(--color-text-primary)]">Sprint Recommendation</h3>

            {savedCalculatedAt ? (
              <div className="mt-3 border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                Showing saved plan from {savedCalculatedAt}. Adjust values above to recalculate.
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {recommended == null ? (
                <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
                  No velocity data available. Set a manual capacity target below.
                </div>
              ) : (
                <div className="capacity-receipt-block rounded-sm bg-[var(--color-bg-secondary)] p-5">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[0.8rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Average Velocity</span>
                    <span
                      className={[
                        "capacity-receipt-row-value text-base font-semibold tabular-nums text-[var(--color-text-primary)]",
                        flashV ? "capacity-receipt-row-value--flash" : ""
                      ].join(" ")}
                    >
                      {capacityState.averageVelocity?.toFixed(1)} <span className="text-[0.85rem] text-[var(--color-text-secondary)]">pts</span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-[0.8rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">× Team Availability</span>
                    <span
                      className={[
                        "capacity-receipt-row-value text-base font-semibold tabular-nums text-[var(--color-text-primary)]",
                        flashR ? "capacity-receipt-row-value--flash" : ""
                      ].join(" ")}
                    >
                      <span className="text-[0.85rem] text-[var(--color-text-secondary)]">×</span>{" "}
                      <span className="text-[0.85rem] text-[var(--color-text-secondary)]">{availabilityPct}%</span>
                    </span>
                  </div>
                  <p className="my-3 font-mono text-[var(--color-text-muted)]">────────────────</p>
                  <div className="mt-1 flex items-end justify-between gap-4">
                    <span className="text-[0.8rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Recommended Capacity</span>
                    <span
                      className={[
                        "capacity-receipt-row-value font-heading text-5xl tabular-nums text-[var(--color-text-primary)]",
                        flashRec ? "capacity-receipt-row-value--flash" : ""
                      ].join(" ")}
                    >
                      {animatedRecReceipt != null ? animatedRecReceipt.toFixed(1) : recommended.toFixed(1)}{" "}
                      <span className="text-lg text-[var(--color-text-secondary)]">pts</span>
                    </span>
                  </div>
                </div>
              )}

              {(capacityState.teamAvailability?.teamAvailabilityRatio ?? 0) === 0 ? (
                <div className="border border-[var(--color-danger)] bg-[var(--color-bg-secondary)] p-2 text-sm text-[var(--color-danger)]">
                  Team has no availability this sprint.
                </div>
              ) : null}

              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                <label className="flex items-center justify-between gap-2 text-sm text-[var(--color-text-primary)]">
                  <span>Snap to nearest Fibonacci</span>
                  <input
                    type="checkbox"
                    checked={capacityState.useSnap}
                    onChange={(e) => setCapacityState((prev) => ({ ...prev, useSnap: e.target.checked }))}
                  />
                </label>
                {recommended != null ? (
                  <div className="mt-3 space-y-3 text-sm">
                    {capacityState.useSnap && rawNear ? (
                      <div className="flex flex-wrap items-end gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Raw</p>
                          <div className="relative mt-1 inline-block">
                            <span className="capacity-strike-raw font-mono text-base tabular-nums">{recommended.toFixed(1)}</span>
                            <span
                              className={[
                                "capacity-strike-line",
                                capacityState.useSnap ? "capacity-strike-line--drawn" : "",
                                snapAnim === "toOff" ? "capacity-strike-line--retract" : ""
                              ].join(" ")}
                            />
                          </div>
                          <span className="ml-1 text-xs text-[var(--color-text-muted)]">pts</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden className="mb-2 text-[var(--color-text-secondary)]">
                            <path d="M2 7h12M12 3l6 4-6 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                          <span
                            className={[
                              "font-heading text-3xl text-[var(--color-accent)] transition-opacity duration-200",
                              capacityState.useSnap ? "opacity-100" : "opacity-0"
                            ].join(" ")}
                          >
                            {capacityState.fibSnapped ?? "-"} <span className="text-sm text-[var(--color-text-secondary)]">pts</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between gap-2">
                        <span className="text-[var(--color-text-muted)]">
                          {capacityState.useSnap ? "Snapped capacity" : "Raw capacity"}
                        </span>
                        <span className="font-heading text-3xl text-[var(--color-accent)]">
                          {(capacityState.useSnap ? capacityState.fibSnapped : recommended)?.toFixed(1) ?? "-"} pts
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                <p className="text-sm text-[var(--color-text-primary)]">Override capacity target</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Leave blank to use the recommended value</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={capacityState.manualOverride ?? ""}
                    onChange={(e) => setManualOverride(e.target.value)}
                    className="w-24 border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)]"
                  />
                  {capacityState.manualOverride != null ? (
                    <button
                      type="button"
                      onClick={() => setCapacityState((prev) => ({ ...prev, manualOverride: null }))}
                      className="text-xs text-[var(--color-text-muted)] underline"
                    >
                      Clear override
                    </button>
                  ) : null}
                </div>

                <div className={["capacity-override-warning mt-2", warnVisible ? "capacity-override-warning--open" : ""].join(" ")}>
                  {warnVisible ? (
                    <div className="flex items-start gap-2 text-xs text-[var(--color-warning)]">
                      <span className={warnShake ? "capacity-warn-icon-shake inline-flex" : "inline-flex"} aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 16 16" className="text-[var(--color-warning)]">
                          <path fill="currentColor" d="M8 1L15 14H1z" />
                          <path fill="var(--color-bg-secondary)" d="M8 5v5M8 12v.01" stroke="var(--color-bg-secondary)" />
                        </svg>
                      </span>
                      <span>
                        {override != null && override > 20
                          ? `This is ${override}% above your recommended capacity`
                          : override != null && override < -40
                            ? `This is ${Math.abs(override)}% below your recommended capacity`
                            : null}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">Final Capacity Target</p>
                <p className="font-heading text-6xl tabular-nums text-[var(--color-accent)]">
                  {animatedFinalCap != null ? Math.round(animatedFinalCap) : capacityState.finalCapacityTarget ?? "-"} pts
                </p>
                {capacityState.manualOverride != null ? (
                  <div className="mt-2 inline-flex">
                    <Badge label="Manual override" color="warning" />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Recommended: {recommended != null ? `${recommended.toFixed(1)} pts` : "-"}
                  </p>
                )}
              </div>

              {context ? (
                <div className="border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Sprint</span>
                    <span className="text-[var(--color-text-primary)]">{context.sprint.name}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Goal</span>
                    <span className="text-[var(--color-text-primary)]">{context.sprint.goal || "No goal set"}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Dates</span>
                    <span className="text-[var(--color-text-primary)]">{formatDateRange(context.sprint.startDate, context.sprint.endDate)}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Working days</span>
                    <span className="text-[var(--color-text-primary)]">{context.workingDaysInSprint}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Members</span>
                    <span className="text-[var(--color-text-primary)]">{context.activeMembers.length}</span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={saveCapacityPlan}
                disabled={
                  savePhase === "saving" ||
                  savePhase === "success" ||
                  !capacityState.teamAvailability ||
                  capacityState.finalCapacityTarget == null
                }
                className={[
                  "capacity-save-btn relative flex min-h-[48px] w-full items-center justify-center overflow-hidden border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
                  savePhase === "success"
                    ? "border-[var(--color-success)] bg-[var(--color-success)] text-[var(--color-text-primary)]"
                    : "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-primary)]"
                ].join(" ")}
              >
                <span
                  className={[
                    "transition-opacity duration-150",
                    savePhase === "saving" || savePhase === "success" ? "pointer-events-none opacity-0" : "opacity-100"
                  ].join(" ")}
                >
                  Save Capacity Plan
                </span>
                <span
                  className={[
                    "absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-150",
                    savePhase === "saving" ? "opacity-100" : "opacity-0"
                  ].join(" ")}
                >
                  <Spinner size="sm" />
                  <span>Saving...</span>
                </span>
                <span
                  className={[
                    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                    savePhase === "success" ? "opacity-100" : "opacity-0"
                  ].join(" ")}
                >
                  Saved ✓
                </span>
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
