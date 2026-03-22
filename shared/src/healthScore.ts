// Developed by Sydney Edwards
import type { Retro, RetroActionItem, Sprint, SprintDaySnapshot, Story } from "./types/domain";
import { formatLocalDateYmd, listWorkingDaysInRange } from "./burndownUtils";

export type HealthComponentScore = {
  score: number;
  max: 20;
  label: string;
  detail: string;
};

export type HealthScoreComponents = {
  velocityAdherence: HealthComponentScore;
  scopeStability: HealthComponentScore;
  capacityAlignment: HealthComponentScore;
  teamAvailability: HealthComponentScore;
  retroHealth: HealthComponentScore;
};

export type HealthScoreResult = {
  total: number;
  grade: string;
  components: HealthScoreComponents;
  trend: "up" | "down" | "stable" | "insufficient_data";
};

export type CalculateHealthScoreParams = {
  /** Optional YYYY-MM-DD for deterministic tests (defaults to today). */
  asOfDateYmd?: string;
  snapshots: SprintDaySnapshot[];
  sprint: Pick<Sprint, "id" | "startDate" | "endDate" | "capacityTarget" | "capacitySnapshot">;
  stories: Story[];
  retro: Retro | null;
  /** Cards in this sprint's retro (for retro health). */
  retroCardCount: number;
  /** Action items for this sprint's retro. */
  actionItems: RetroActionItem[];
  /** Action items from the last two retros (excluding current), for closure-rate sub-score. */
  previousRetrosActionItems: RetroActionItem[];
  /** For trend: previous completed sprint's stored health total, if any. */
  previousSprintHealthTotal?: number | null;
  /** When `capacitySnapshot` has no ratio, pass live ratio from current team availability. */
  liveTeamAvailabilityRatio?: number | null;
};

function parseYmdStart(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return new Date(s).setHours(0, 0, 0, 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function minYmd(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

function workingDaysBetweenInclusive(startDate: string, endDate: string): number {
  if (parseYmdStart(endDate) < parseYmdStart(startDate)) return 0;
  return listWorkingDaysInRange(startDate, endDate).length;
}

function parseSnapshotRatio(sprint: CalculateHealthScoreParams["sprint"]): number | null {
  const snap = sprint.capacitySnapshot;
  if (snap == null || typeof snap !== "object") return null;
  const r = (snap as { teamAvailabilityRatio?: unknown }).teamAvailabilityRatio;
  if (typeof r === "number" && Number.isFinite(r)) return r;
  return null;
}

export function scoreVelocityAdherence(params: {
  completedPoints: number;
  totalPoints: number;
  sprintStart: string;
  sprintEnd: string;
  capacityTarget: number | null | undefined;
  asOfDateYmd?: string;
}): HealthComponentScore {
  const label = "Velocity adherence";
  const totalWorkDays = Math.max(
    1,
    workingDaysBetweenInclusive(params.sprintStart, params.sprintEnd)
  );
  const today = params.asOfDateYmd ?? formatLocalDateYmd();
  const windowEnd = minYmd(today, params.sprintEnd);
  const workingElapsed =
    windowEnd < params.sprintStart ? 0 : workingDaysBetweenInclusive(params.sprintStart, windowEnd);

  if (workingElapsed === 0) {
    return {
      score: 10,
      max: 20,
      label,
      detail: "Sprint just started — neutral score until time elapses."
    };
  }

  const targetPts = params.capacityTarget ?? params.totalPoints;
  const idealBurnRate = targetPts / totalWorkDays;
  const actualBurnRate = params.completedPoints / workingElapsed;

  if (idealBurnRate <= 0 || !Number.isFinite(idealBurnRate)) {
    return {
      score: 10,
      max: 20,
      label,
      detail: "Cannot derive ideal burn rate — neutral score."
    };
  }

  const ratio = actualBurnRate / idealBurnRate;
  let score = 0;
  if (ratio >= 0.95) score = 20;
  else if (ratio >= 0.8) score = 15;
  else if (ratio >= 0.65) score = 10;
  else if (ratio >= 0.5) score = 5;

  const idealPerDay = idealBurnRate.toFixed(1);
  const actualPerDay = actualBurnRate.toFixed(1);
  const pct = Math.round(ratio * 100);
  const detail = `Burning at ${actualPerDay} pts/working day vs ideal ${idealPerDay} (${pct}% of target pace).`;

  return { score, max: 20, label, detail };
}

export function scoreScopeStability(
  stories: Story[],
  sprintStartDate: string
): HealthComponentScore {
  const label = "Scope stability";
  const addedAfterStart = stories.filter((s) => {
    if (!s.sprintAddedAt) return false;
    const d = s.sprintAddedAt.slice(0, 10);
    return d > sprintStartDate;
  }).length;
  const originalStoryCount = Math.max(0, stories.length - addedAfterStart);
  const denom = Math.max(1, originalStoryCount);
  const ratio = addedAfterStart / denom;

  let score = 0;
  if (ratio === 0) score = 20;
  else if (ratio <= 0.1) score = 16;
  else if (ratio <= 0.2) score = 12;
  else if (ratio <= 0.3) score = 6;

  const detail =
    addedAfterStart === 0
      ? "No stories added after sprint start."
      : `${addedAfterStart} stor${addedAfterStart === 1 ? "y" : "ies"} added after sprint start (${Math.round(ratio * 100)}% scope creep vs original ${originalStoryCount}).`;

  return { score, max: 20, label, detail };
}

export function scoreCapacityAlignment(
  totalPoints: number,
  capacityTarget: number | null | undefined
): HealthComponentScore {
  const label = "Capacity alignment";
  if (capacityTarget == null || capacityTarget <= 0) {
    return {
      score: 10,
      max: 20,
      label,
      detail: "No capacity target set — neutral score."
    };
  }

  const overUnder = totalPoints / capacityTarget;
  let score = 0;
  if (overUnder >= 0.9 && overUnder <= 1.1) score = 20;
  else if (overUnder >= 0.8 && overUnder <= 1.2) score = 14;
  else if (overUnder >= 0.7 && overUnder <= 1.3) score = 8;

  const detail = `Planned ${totalPoints} pts vs capacity target ${capacityTarget} (${(overUnder * 100).toFixed(0)}%).`;
  return { score, max: 20, label, detail };
}

export function scoreTeamAvailability(
  sprint: CalculateHealthScoreParams["sprint"],
  liveRatio: number | null | undefined
): HealthComponentScore {
  const label = "Team availability";
  const snapRatio = parseSnapshotRatio(sprint);
  const ratio = snapRatio ?? liveRatio ?? null;

  if (ratio == null || !Number.isFinite(ratio)) {
    return {
      score: 10,
      max: 20,
      label,
      detail: "No availability snapshot — neutral score."
    };
  }

  let score = 0;
  if (ratio >= 0.95) score = 20;
  else if (ratio >= 0.85) score = 16;
  else if (ratio >= 0.7) score = 10;
  else if (ratio >= 0.55) score = 5;

  const src = snapRatio != null ? "saved planning snapshot" : "current team availability";
  const detail = `Team availability ratio ${(ratio * 100).toFixed(0)}% (${src}).`;
  return { score, max: 20, label, detail };
}

export function scoreRetroHealth(params: {
  retro: Retro | null;
  retroCardCount: number;
  actionItems: RetroActionItem[];
  previousRetrosActionItems: RetroActionItem[];
}): HealthComponentScore {
  const label = "Retro health";
  let score = 0;
  const bits: string[] = [];

  if (params.retro) {
    score += 5;
    bits.push("retro scheduled");
  } else {
    bits.push("no retro yet");
  }

  if (params.retroCardCount >= 3) {
    score += 5;
    bits.push(`${params.retroCardCount} cards`);
  } else {
    bits.push(`only ${params.retroCardCount} card(s)`);
  }

  if (params.actionItems.length > 0) {
    score += 5;
    bits.push(`${params.actionItems.length} action item(s)`);
  } else {
    bits.push("no action items");
  }

  const prev = params.previousRetrosActionItems;
  const totalPrev = prev.length;
  const completedPrev = prev.filter((i) => i.status === "complete").length;
  let closurePts = 0;
  if (totalPrev > 0) {
    const closedRate = completedPrev / totalPrev;
    if (closedRate >= 0.5) closurePts = 5;
    else if (closedRate > 0) closurePts = 2;
  }
  score += closurePts;
  const closureDetail =
    totalPrev === 0
      ? "no prior retro action items to measure closure."
      : `${completedPrev}/${totalPrev} prior retro action items closed (${Math.round((completedPrev / totalPrev) * 100)}%).`;

  const detail = `${bits.join("; ")}. ${closureDetail}`;

  return { score, max: 20, label, detail };
}

export function gradeFromTotal(total: number): string {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "F";
}

export function calculateHealthScore(params: CalculateHealthScoreParams): HealthScoreResult {
  const sprint = params.sprint;
  const stories = params.stories.filter((s) => s.sprintId === sprint.id);
  const completedPoints = stories
    .filter((s) => s.boardColumn === "done")
    .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);

  const velocityAdherence = scoreVelocityAdherence({
    completedPoints,
    totalPoints,
    sprintStart: sprint.startDate,
    sprintEnd: sprint.endDate,
    capacityTarget: sprint.capacityTarget,
    asOfDateYmd: params.asOfDateYmd
  });

  const scopeStability = scoreScopeStability(stories, sprint.startDate);
  const capacityAlignment = scoreCapacityAlignment(totalPoints, sprint.capacityTarget);
  const teamAvailability = scoreTeamAvailability(sprint, params.liveTeamAvailabilityRatio ?? null);
  const retroHealth = scoreRetroHealth({
    retro: params.retro,
    retroCardCount: params.retroCardCount,
    actionItems: params.actionItems,
    previousRetrosActionItems: params.previousRetrosActionItems
  });

  const components: HealthScoreComponents = {
    velocityAdherence,
    scopeStability,
    capacityAlignment,
    teamAvailability,
    retroHealth
  };

  const total = Object.values(components).reduce((sum, c) => sum + c.score, 0);
  const grade = gradeFromTotal(total);

  let trend: HealthScoreResult["trend"] = "insufficient_data";
  const prev = params.previousSprintHealthTotal;
  if (prev != null && Number.isFinite(prev)) {
    if (total > prev + 2) trend = "up";
    else if (total < prev - 2) trend = "down";
    else trend = "stable";
  }

  return { total, grade, components, trend };
}
