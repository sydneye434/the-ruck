// Developed by Sydney Edwards
import type { BurndownProjection, BurndownProjectedStatus, SprintDaySnapshot } from "./types/domain";

export type SprintDateRange = {
  startDate: string;
  endDate: string;
};

/** List YYYY-MM-DD calendar dates Mon–Fri inclusive between start and end (local date parsing). */
export function listWorkingDaysInRange(startDate: string, endDate: string): string[] {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (!start || !end || end.getTime() < start.getTime()) return [];

  const out: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      out.push(formatYmd(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function parseYmd(s: string): Date | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local calendar date YYYY-MM-DD (for snapshot dating). */
export function formatLocalDateYmd(d: Date = new Date()): string {
  return formatYmd(d);
}

export function calendarDaysBetweenYmd(a: string, b: string): number {
  const da = parseYmd(a);
  const db = parseYmd(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

/**
 * Linear ideal burndown: totalPoints on first working day → 0 on last working day.
 * One entry per working day (Mon–Fri).
 */
export function calculateIdealBurndown(
  sprint: SprintDateRange,
  totalPoints: number
): Array<{ date: string; idealRemaining: number }> {
  const days = listWorkingDaysInRange(sprint.startDate, sprint.endDate);
  const n = days.length;
  if (n === 0 || totalPoints <= 0) return [];
  if (n === 1) {
    return [{ date: days[0], idealRemaining: 0 }];
  }
  return days.map((date, i) => ({
    date,
    idealRemaining: totalPoints * (1 - i / (n - 1))
  }));
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export type SnapshotLike = Pick<SprintDaySnapshot, "date" | "remainingPoints" | "completedPoints">;

/**
 * Uses the last up to 3 snapshots to estimate average daily burn (completed points per calendar day).
 * Projects when remaining hits zero. Returns null if not enough data or no burn.
 */
export function calculateProjectedCompletion(
  snapshots: SnapshotLike[] | null | undefined,
  sprint: SprintDateRange
): BurndownProjection {
  const sorted = [...(snapshots ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) {
    return { date: null, status: null, daysDeltaVsEnd: null };
  }

  const lastThree = sorted.slice(-3);
  let burnSum = 0;
  let burnCount = 0;
  for (let i = 1; i < lastThree.length; i++) {
    const prev = lastThree[i - 1];
    const cur = lastThree[i];
    const days = Math.max(1, calendarDaysBetweenYmd(prev.date, cur.date));
    const completedDelta = cur.completedPoints - prev.completedPoints;
    const rate = completedDelta / days;
    if (rate > 0) {
      burnSum += rate;
      burnCount += 1;
    }
  }

  if (burnCount === 0) {
    return { date: null, status: null, daysDeltaVsEnd: null };
  }

  const avgBurn = burnSum / burnCount;
  const last = sorted[sorted.length - 1];
  const remaining = last.remainingPoints;
  const todayStr = formatYmd(new Date());

  if (remaining <= 0) {
    const daysAfterEnd = calendarDaysBetweenYmd(sprint.endDate, last.date);
    let status: BurndownProjectedStatus | null = "on_track";
    if (daysAfterEnd > 2) status = "overdue";
    else if (daysAfterEnd > 0) status = "at_risk";
    return {
      date: last.date,
      status,
      /** Positive = projected/finish after sprint end (late). */
      daysDeltaVsEnd: daysAfterEnd
    };
  }

  const daysNeeded = Math.ceil(remaining / avgBurn);
  const projectedDate = addCalendarDaysYmd(last.date, daysNeeded);

  /** Days projected completion is after sprint end (0 = on time, positive = late). */
  const lateBy = calendarDaysBetweenYmd(sprint.endDate, projectedDate);

  let status: BurndownProjectedStatus;
  if (compareYmd(todayStr, sprint.endDate) > 0) {
    status = "overdue";
  } else if (lateBy <= 0) {
    status = "on_track";
  } else if (lateBy <= 2) {
    status = "at_risk";
  } else {
    status = "overdue";
  }

  return {
    date: projectedDate,
    status,
    daysDeltaVsEnd: lateBy
  };
}

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** S-curve progress 0..1 for t in [0,1] (slow start / middle / tail). */
export function burndownProgressSCurve(t: number): number {
  return smoothstep01(t);
}
