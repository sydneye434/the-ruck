// Developed by Sydney Edwards
import { describe, it, expect } from "vitest";
import { getVelocityWindow, calculateTrend } from "../src/lib/velocityEngine";

describe("Velocity engine (UI-facing)", () => {
  it("getVelocityWindow with n > available sprints → returns all available", () => {
    const completed = [
      { id: "1", name: "A", completedAt: "2025-01-05T00:00:00.000Z", velocityDataPoint: 5 },
      { id: "2", name: "B", completedAt: "2025-01-01T00:00:00.000Z", velocityDataPoint: 3 }
    ];
    const windowed = getVelocityWindow(completed, 10);
    expect(windowed.length).toBe(2);
  });

  it("calculateTrend: all same velocity → flat", () => {
    expect(
      calculateTrend([{ velocityDataPoint: 7 }, { velocityDataPoint: 7 }, { velocityDataPoint: 7 }])
    ).toBe("flat");
  });

  it("calculateTrend: two sprints", () => {
    expect(calculateTrend([{ velocityDataPoint: 20 }, { velocityDataPoint: 10 }])).toBe("up");
  });

  it("calculateTrend: single sprint → insufficient_data", () => {
    expect(calculateTrend([{ velocityDataPoint: 5 }])).toBe("insufficient_data");
  });
});
