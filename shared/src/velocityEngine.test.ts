// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  snapToFibonacci,
  calculateTrend,
  calculateTeamAvailability,
  calculateRecommendedCapacity,
  getVelocityWindow,
  getConfidenceLevel,
  calculateAverageVelocity,
  buildCapacitySnapshot,
  calculateEffectiveDays
} from "./velocityEngine";

test("snapToFibonacci cases", () => {
  assert.equal(snapToFibonacci(36), 34);
  assert.equal(snapToFibonacci(22), 21);
  assert.equal(snapToFibonacci(18), 21);
  assert.equal(snapToFibonacci(4), 5);
  assert.equal(snapToFibonacci(1), 1);
  assert.equal(snapToFibonacci(0), 1);
  assert.equal(snapToFibonacci(150), 144);
});

test("calculateTrend cases (newest-first, matches getVelocityWindow order)", () => {
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 50 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 30 }
    ]),
    "up"
  );
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 30 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 50 }
    ]),
    "down"
  );
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 42 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 38 }
    ]),
    "flat"
  );
  assert.equal(calculateTrend([{ velocityDataPoint: 42 }]), "insufficient_data");
});

test("calculateTeamAvailability full capacity, no days off", () => {
  const result = calculateTeamAvailability(
    [
      { id: "a", defaultAvailabilityDays: 8, capacityMultiplier: 100 },
      { id: "b", defaultAvailabilityDays: 8, capacityMultiplier: 100 }
    ],
    {}
  );
  assert.equal(result.totalEffectiveDays, 16);
  assert.equal(result.teamAvailabilityRatio, 1);
});

test("calculateTeamAvailability mixed capacity, no days off", () => {
  const result = calculateTeamAvailability(
    [
      { id: "a", defaultAvailabilityDays: 8, capacityMultiplier: 50 },
      { id: "b", defaultAvailabilityDays: 8, capacityMultiplier: 100 }
    ],
    {}
  );
  assert.equal(result.totalEffectiveDays, 12);
  assert.equal(result.teamAvailabilityRatio, 1);
});

test("calculateTeamAvailability single member with days off", () => {
  const result = calculateTeamAvailability(
    [{ id: "a", defaultAvailabilityDays: 8, capacityMultiplier: 100 }],
    { a: 3 }
  );
  assert.equal(result.memberBreakdown[0].availableDays, 5);
  assert.equal(result.teamAvailabilityRatio, 0.625);
});

test("calculateRecommendedCapacity cases", () => {
  assert.equal(calculateRecommendedCapacity(42, 0.85), 35.7);
  assert.equal(calculateRecommendedCapacity(null, 0.85), null);
});

test("getVelocityWindow when n > available sprints → returns all available", () => {
  const sprints = [
    { id: "a", name: "A", completedAt: "2025-01-01T00:00:00.000Z", velocityDataPoint: 10 },
    { id: "b", name: "B", completedAt: "2024-12-01T00:00:00.000Z", velocityDataPoint: 8 }
  ];
  const w = getVelocityWindow(sprints, 5);
  assert.equal(w.length, 2);
});

test("calculateTrend: all same velocity → flat", () => {
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 10 },
      { velocityDataPoint: 10 },
      { velocityDataPoint: 10 }
    ]),
    "flat"
  );
});

test("calculateTrend: two sprints only", () => {
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 12 },
      { velocityDataPoint: 8 }
    ]),
    "up"
  );
});

test("getConfidenceLevel maps sprint counts", () => {
  assert.equal(getConfidenceLevel(0), "none");
  assert.equal(getConfidenceLevel(1), "low");
  assert.equal(getConfidenceLevel(3), "medium");
  assert.equal(getConfidenceLevel(5), "high");
  assert.equal(getConfidenceLevel(null), "none");
});

test("calculateAverageVelocity", () => {
  assert.equal(calculateAverageVelocity(null), null);
  assert.equal(calculateAverageVelocity([]), null);
  assert.equal(calculateAverageVelocity([{ velocityDataPoint: 10 }, { velocityDataPoint: 20 }]), 15);
});

test("buildCapacitySnapshot preserves fields", () => {
  const snap = buildCapacitySnapshot({
    velocityWindow: 3,
    averageVelocity: 12,
    teamAvailabilityRatio: 0.8,
    memberBreakdown: [],
    recommendedCapacity: 9.6,
    finalCapacityTarget: 8,
    fibonacciSnapped: true
  });
  assert.equal(snap.velocityWindow, 3);
  assert.equal(snap.fibonacciSnapped, true);
  assert.ok(snap.calculatedAt instanceof Date);
});

test("getVelocityWindow edge cases", () => {
  assert.deepEqual(getVelocityWindow(null, 3), []);
  assert.deepEqual(getVelocityWindow([], 2), []);
  assert.deepEqual(
    getVelocityWindow(
      [{ id: "x", name: "N", completedAt: "2025-01-01T00:00:00.000Z", velocityDataPoint: 1 }],
      0
    ),
    []
  );
  const mixed = [
    { id: "bad", name: "", completedAt: "", velocityDataPoint: 1 },
    { id: "ok", name: "OK", completedAt: "2025-06-01T00:00:00.000Z", velocityDataPoint: 5 }
  ];
  assert.equal(getVelocityWindow(mixed as any, 5).length, 1);
});

test("calculateEffectiveDays", () => {
  assert.equal(calculateEffectiveDays(10, 100), 10);
  assert.equal(calculateEffectiveDays(10, 50), 5);
});

test("calculateTeamAvailability empty / null members", () => {
  const empty = calculateTeamAvailability([], {});
  assert.equal(empty.totalEffectiveDays, 0);
  assert.equal(empty.teamAvailabilityRatio, 0);
  assert.equal(calculateTeamAvailability(null, {}).memberBreakdown.length, 0);
});

test("snapToFibonacci invalid input", () => {
  assert.equal(snapToFibonacci(Number.NaN), null);
  assert.equal(snapToFibonacci(Number.POSITIVE_INFINITY), null);
});

test("calculateRecommendedCapacity when ratio undefined", () => {
  assert.equal(calculateRecommendedCapacity(10, undefined), null);
});
