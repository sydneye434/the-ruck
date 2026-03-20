// @ts-expect-error shared JS module has no type declarations.
import * as velocityEngineModule from "../../../shared/velocityEngine.js";

const engine = velocityEngineModule as any;

export const getVelocityWindow = engine.getVelocityWindow as (
  completedSprints: Array<{ id: string; name: string; completedAt: string; velocityDataPoint: number }>,
  n: number
) => Array<{ id: string; name: string; completedAt: string; velocityDataPoint: number }>;

export const calculateAverageVelocity = engine.calculateAverageVelocity as (
  sprints: Array<{ velocityDataPoint: number }>
) => number | null;

export const calculateTrend = engine.calculateTrend as (
  sprints: Array<{ velocityDataPoint: number }>
) => "up" | "down" | "flat" | "insufficient_data";

export const getConfidenceLevel = engine.getConfidenceLevel as (
  totalCompletedSprintCount: number
) => "high" | "medium" | "low" | "none";

export const calculateTeamAvailability = engine.calculateTeamAvailability as (
  members: Array<{ id: string; defaultAvailabilityDays: number; capacityMultiplier: number }>,
  daysOffMap: Record<string, number>
) => {
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

