// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  snapToFibonacci,
  calculateTrend,
  calculateTeamAvailability,
  calculateRecommendedCapacity
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

test("calculateTrend cases", () => {
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 30 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 50 }
    ]),
    "up"
  );
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 50 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 30 }
    ]),
    "down"
  );
  assert.equal(
    calculateTrend([
      { velocityDataPoint: 38 },
      { velocityDataPoint: 40 },
      { velocityDataPoint: 42 }
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
