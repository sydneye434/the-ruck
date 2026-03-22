// Developed by Sydney Edwards
import { describe, it, expect } from "vitest";
import { calculateTeamAvailability, calculateRecommendedCapacity, snapToFibonacci } from "../src/lib/velocityEngine";
import { computeOverridePercent, shouldWarnCapacityAboveRecommended } from "../src/lib/capacityPlanningUtils";

describe("Capacity planning calculations", () => {
  it("snapToFibonacci edge cases (shared utility, re-verified)", () => {
    expect(snapToFibonacci(36)).toBe(34);
    expect(snapToFibonacci(0)).toBe(1);
    expect(snapToFibonacci(150)).toBe(144);
  });

  it("calculateRecommendedCapacity with known inputs → correct output", () => {
    expect(calculateRecommendedCapacity(40, 0.75)).toBe(30);
    expect(calculateRecommendedCapacity(10, 1)).toBe(10);
  });

  it("override warning: 21% above recommendation → warn", () => {
    const pct = computeOverridePercent(121, 100);
    expect(pct).toBe(21);
    expect(shouldWarnCapacityAboveRecommended(pct)).toBe(true);
  });

  it("override warning: 19% above → no warn", () => {
    const pct = computeOverridePercent(119, 100);
    expect(pct).toBe(19);
    expect(shouldWarnCapacityAboveRecommended(pct)).toBe(false);
  });

  it("real-time: days-off change updates recommendation via team availability ratio", () => {
    const members = [{ id: "m1", defaultAvailabilityDays: 10, capacityMultiplier: 100 }];
    const noDaysOff = calculateTeamAvailability(members, {});
    const withDaysOff = calculateTeamAvailability(members, { m1: 5 });
    const recA = calculateRecommendedCapacity(20, noDaysOff.teamAvailabilityRatio);
    const recB = calculateRecommendedCapacity(20, withDaysOff.teamAvailabilityRatio);
    expect(recA).toBe(20);
    expect(recB).toBe(10);
  });
});
