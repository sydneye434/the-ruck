// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dashboardUtils = require(path.join(__dirname, "..", "..", "server", "src", "utils", "dashboardUtils.js")) as {
  calculateDaysRemaining: (endDate: string) => number;
  calculateProgressPercent: (completed: number, total: number) => number;
  getOverdueActionItems: (items: any[]) => any[];
  buildVelocityTrend: (sprints: any[], limit?: number) => any[];
};

test("calculateDaysRemaining: future date → positive, today → 0, past → negative", () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const isoToday = `${y}-${m}-${d}`;

  const future = new Date(today);
  future.setDate(future.getDate() + 5);
  const isoFuture = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;

  const past = new Date(today);
  past.setDate(past.getDate() - 3);
  const isoPast = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;

  assert.ok(dashboardUtils.calculateDaysRemaining(isoFuture) > 0);
  assert.equal(dashboardUtils.calculateDaysRemaining(isoToday), 0);
  assert.ok(dashboardUtils.calculateDaysRemaining(isoPast) < 0);
});

test("calculateProgressPercent: 0 total → returns 0", () => {
  assert.equal(dashboardUtils.calculateProgressPercent(5, 0), 0);
  assert.equal(dashboardUtils.calculateProgressPercent(0, 0), 0);
});

test("calculateProgressPercent: normal values", () => {
  assert.equal(dashboardUtils.calculateProgressPercent(1, 4), 25);
  assert.equal(dashboardUtils.calculateProgressPercent(3, 10), 30);
});

test("buildVelocityTrend: sorts newest first, respects limit, fills defaults", () => {
  const rows = [
    { id: "a", name: "Old", completedAt: "2024-01-01T00:00:00.000Z", velocityDataPoint: 5 },
    { id: "b", name: "New", completedAt: "2025-01-01T00:00:00.000Z" },
    { id: "bad", name: "X", completedAt: null }
  ];
  const trend = dashboardUtils.buildVelocityTrend(rows, 2);
  assert.equal(trend.length, 2);
  assert.equal(trend[0].id, "b");
  assert.equal(trend[0].velocityDataPoint, 0);
  assert.equal(trend[1].id, "a");
  assert.equal(trend[1].capacityTarget, null);
});

test("calculateDaysRemaining parses non-ISO date strings", () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const iso = d.toISOString();
  assert.ok(dashboardUtils.calculateDaysRemaining(iso) >= 1);
});

test("getOverdueActionItems: filters and sorts by dueDate", () => {
  const items = [
    { id: "a", dueDate: "2020-01-10T00:00:00.000Z", status: "open" },
    { id: "b", dueDate: "2020-01-02T00:00:00.000Z", status: "open" },
    { id: "c", dueDate: "2020-01-05T00:00:00.000Z", status: "complete" },
    { id: "d", dueDate: "2099-01-01T00:00:00.000Z", status: "open" },
    { id: "ip", dueDate: "2020-01-03T00:00:00.000Z", status: "in_progress" }
  ];
  const overdue = dashboardUtils.getOverdueActionItems(items);
  assert.equal(overdue.length, 3);
  assert.equal(overdue[0].id, "b");
  assert.equal(overdue[1].id, "ip");
  assert.equal(overdue[2].id, "a");
});

test("getOverdueActionItems: null input safe", () => {
  assert.deepEqual(dashboardUtils.getOverdueActionItems(null as any), []);
});
