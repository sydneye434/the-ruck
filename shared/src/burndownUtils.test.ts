// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateIdealBurndown,
  calculateProjectedCompletion,
  listWorkingDaysInRange
} from "./burndownUtils";
import type { SprintDaySnapshot } from "./types/domain";

test("calculateIdealBurndown: 10 calendar days with weekends → Mon–Fri only", () => {
  const sprint = { startDate: "2025-06-02", endDate: "2025-06-13" };
  const ideal = calculateIdealBurndown(sprint, 50);
  const days = listWorkingDaysInRange(sprint.startDate, sprint.endDate);
  assert.equal(ideal.length, days.length);
  assert.equal(ideal[0].idealRemaining, 50);
  assert.ok(Math.abs(ideal[ideal.length - 1].idealRemaining) < 1e-6);
  assert.ok(ideal.every((row) => days.includes(row.date)));
});

test("calculateIdealBurndown: sprint with weekends excluded from entries", () => {
  const sprint = { startDate: "2025-06-09", endDate: "2025-06-15" };
  const ideal = calculateIdealBurndown(sprint, 40);
  assert.ok(ideal.every((row) => !row.date.endsWith("Invalid")));
  assert.ok(!ideal.some((row) => {
    const d = new Date(row.date + "T12:00:00");
    const day = d.getDay();
    return day === 0 || day === 6;
  }));
});

test("calculateProjectedCompletion: 5 pts/day from last 3 snaps, 30 remaining → ~6 days out", () => {
  const sprint = { startDate: "2025-01-06", endDate: "2025-01-20" };
  const snaps: Pick<SprintDaySnapshot, "date" | "remainingPoints" | "completedPoints">[] = [
    { date: "2025-01-06", remainingPoints: 40, completedPoints: 0 },
    { date: "2025-01-07", remainingPoints: 35, completedPoints: 5 },
    { date: "2025-01-08", remainingPoints: 30, completedPoints: 10 }
  ];
  const p = calculateProjectedCompletion(snaps, sprint);
  assert.ok(p.date);
  assert.equal(p.date, "2025-01-14");
});

test("calculateProjectedCompletion: zero burn → null date", () => {
  const sprint = { startDate: "2025-01-06", endDate: "2025-01-20" };
  const snaps = [
    { date: "2025-01-06", remainingPoints: 20, completedPoints: 0 },
    { date: "2025-01-07", remainingPoints: 20, completedPoints: 0 }
  ];
  const p = calculateProjectedCompletion(snaps, sprint);
  assert.equal(p.date, null);
  assert.equal(p.status, null);
});

test("calculateProjectedCompletion: fewer than 2 snapshots → null", () => {
  const sprint = { startDate: "2025-01-06", endDate: "2025-01-20" };
  const p = calculateProjectedCompletion(
    [{ date: "2025-01-06", remainingPoints: 10, completedPoints: 0 }],
    sprint
  );
  assert.equal(p.date, null);
});
