// Developed by Sydney Edwards
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export type VelocitySprintRow = {
  id: string;
  name: string;
  completedAt: string;
  velocityDataPoint: number;
};

export function getVelocityWindow(
  completedSprints: Array<{ completedAt?: string; velocityDataPoint?: number } & Record<string, unknown>> | null | undefined,
  n: number
): VelocitySprintRow[] {
  const normalized = [...(completedSprints ?? [])]
    .filter((s) => s && s.completedAt && typeof s.velocityDataPoint === "number")
    .sort((a, b) => new Date(String(b.completedAt)).getTime() - new Date(String(a.completedAt)).getTime())
    .map((s) => ({
      id: String((s as { id: string }).id),
      name: String((s as { name: string }).name),
      completedAt: String(s.completedAt),
      velocityDataPoint: Number(s.velocityDataPoint)
    }));

  if (!Number.isFinite(n) || n <= 0) return [];
  return normalized.slice(0, n);
}

export function calculateAverageVelocity(sprints: Array<{ velocityDataPoint?: number }> | null | undefined): number | null {
  if (!Array.isArray(sprints) || sprints.length === 0) return null;
  const sum = sprints.reduce((acc, s) => acc + Number(s.velocityDataPoint || 0), 0);
  return round1(sum / sprints.length);
}

export function calculateTrend(
  sprints: Array<{ velocityDataPoint?: number }> | null | undefined
): "up" | "down" | "flat" | "insufficient_data" {
  if (!Array.isArray(sprints) || sprints.length < 2) return "insufficient_data";

  // Window lists are sorted newest-first (see getVelocityWindow); index 0 is the latest sprint.
  const mostRecent = Number(sprints[0].velocityDataPoint || 0);
  const fullAvg =
    sprints.reduce((acc, sprint) => acc + Number(sprint.velocityDataPoint || 0), 0) / sprints.length;
  if (fullAvg === 0) return "flat";

  const ratioDelta = (mostRecent - fullAvg) / fullAvg;
  if (ratioDelta > 0.05) return "up";
  if (ratioDelta < -0.05) return "down";
  return "flat";
}

export function getConfidenceLevel(totalCompletedSprintCount: number | null | undefined): "high" | "medium" | "low" | "none" {
  const n = Number(totalCompletedSprintCount || 0);
  if (n >= 5) return "high";
  if (n >= 3) return "medium";
  if (n >= 1) return "low";
  return "none";
}

export function calculateEffectiveDays(defaultAvailabilityDays: number, capacityMultiplier: number) {
  const d = Number(defaultAvailabilityDays || 0);
  const c = Number(capacityMultiplier || 0);
  return round1(d * (c / 100));
}

export type TeamAvailabilityResult = {
  memberBreakdown: Array<{
    memberId: string;
    effectiveDays: number;
    daysOff: number;
    availableDays: number;
    availabilityPercent: number;
  }>;
  totalEffectiveDays: number;
  totalDaysOff: number;
  totalAvailableDays: number;
  teamAvailabilityRatio: number;
};

export function calculateTeamAvailability(
  members: Array<{ id: string; defaultAvailabilityDays: number; capacityMultiplier: number }> | null | undefined,
  daysOffMap: Record<string, number> | null | undefined
): TeamAvailabilityResult {
  const sourceMembers = Array.isArray(members) ? members : [];
  const map = daysOffMap ?? {};

  const memberBreakdown = sourceMembers.map((member) => {
    const effectiveDays = calculateEffectiveDays(
      Number(member.defaultAvailabilityDays || 0),
      Number(member.capacityMultiplier || 100)
    );
    const daysOff = Number(map[member.id] ?? 0);
    const availableDays = round1(Math.max(0, effectiveDays - daysOff));
    const availabilityPercent = effectiveDays > 0 ? round1((availableDays / effectiveDays) * 100) : 0;

    return {
      memberId: member.id,
      effectiveDays,
      daysOff: round1(daysOff),
      availableDays,
      availabilityPercent
    };
  });

  const totalEffectiveDays = round1(memberBreakdown.reduce((acc, m) => acc + m.effectiveDays, 0));
  const totalDaysOff = round1(memberBreakdown.reduce((acc, m) => acc + m.daysOff, 0));
  const totalAvailableDays = round1(memberBreakdown.reduce((acc, m) => acc + m.availableDays, 0));
  const teamAvailabilityRatio = totalEffectiveDays > 0 ? totalAvailableDays / totalEffectiveDays : 0;

  return {
    memberBreakdown,
    totalEffectiveDays,
    totalDaysOff,
    totalAvailableDays,
    teamAvailabilityRatio
  };
}

export function calculateRecommendedCapacity(
  averageVelocity: number | null | undefined,
  teamAvailabilityRatio: number | null | undefined
): number | null {
  if (averageVelocity === null || averageVelocity === undefined) return null;
  if (teamAvailabilityRatio === null || teamAvailabilityRatio === undefined) return null;
  return round1(Number(averageVelocity) * Number(teamAvailabilityRatio));
}

export function snapToFibonacci(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (v <= FIBONACCI[0]) return FIBONACCI[0];
  if (v >= FIBONACCI[FIBONACCI.length - 1]) return FIBONACCI[FIBONACCI.length - 1];

  let best = FIBONACCI[0];
  let bestDist = Math.abs(v - best);

  for (const f of FIBONACCI) {
    const dist = Math.abs(v - f);
    if (dist < bestDist) {
      best = f;
      bestDist = dist;
    } else if (dist === bestDist && f > best) {
      best = f;
    }
  }
  return best;
}

export function buildCapacitySnapshot(params: {
  velocityWindow: 1 | 2 | 3 | 5;
  averageVelocity: number | null;
  teamAvailabilityRatio: number;
  memberBreakdown: TeamAvailabilityResult["memberBreakdown"];
  recommendedCapacity: number | null;
  finalCapacityTarget: number | null;
  fibonacciSnapped: boolean;
}) {
  return {
    velocityWindow: params.velocityWindow,
    averageVelocity: params.averageVelocity,
    teamAvailabilityRatio: params.teamAvailabilityRatio,
    memberBreakdown: params.memberBreakdown,
    recommendedCapacity: params.recommendedCapacity,
    finalCapacityTarget: params.finalCapacityTarget,
    fibonacciSnapped: Boolean(params.fibonacciSnapped),
    calculatedAt: new Date()
  };
}
