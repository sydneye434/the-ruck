// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  snapToFibonacci,
  calculateTrend,
  calculateTeamAvailability,
  calculateRecommendedCapacity,
  getVelocityWindow
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
