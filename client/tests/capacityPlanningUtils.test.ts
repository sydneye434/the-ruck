// Developed by Sydney Edwards
import { describe, it, expect } from "vitest";
import {
  computeOverridePercent,
  shouldWarnCapacityAboveRecommended
} from "../src/lib/capacityPlanningUtils";

describe("capacityPlanningUtils", () => {
  it("computeOverridePercent returns null when inputs missing", () => {
    expect(computeOverridePercent(null, 10)).toBeNull();
    expect(computeOverridePercent(10, null)).toBeNull();
  });

  it("computeOverridePercent calculates percent delta", () => {
    expect(computeOverridePercent(120, 100)).toBe(20);
    expect(computeOverridePercent(79, 100)).toBe(-21);
  });

  it("shouldWarnCapacityAboveRecommended is true only above 20%", () => {
    expect(shouldWarnCapacityAboveRecommended(21)).toBe(true);
    expect(shouldWarnCapacityAboveRecommended(20)).toBe(false);
    expect(shouldWarnCapacityAboveRecommended(null)).toBe(false);
  });
});
