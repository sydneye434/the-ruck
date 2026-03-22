// Developed by Sydney Edwards
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";
import { seedEmptyStores, wipeTestDataDir, writeStore } from "./testData.js";
import { createActionItem, createRetro, createSprint, createMember } from "./factories.js";
import { assertStatus } from "./assertResponse";

const app = createApp();

before(() => {
  wipeTestDataDir();
  seedEmptyStores();
});

after(() => {
  wipeTestDataDir();
});

test("GET /api/dashboard → 200, all sections present", async () => {
  const res = await request(app).get("/api/dashboard");
  assertStatus(res, 200);
  const d = res.body.data;
  assert.ok(d.activeSprint !== undefined);
  assert.ok(Array.isArray(d.velocityTrend));
  assert.ok(d.teamSummary);
  assert.ok(d.retroSummary);
  assert.ok(Array.isArray(d.recentActivity));
});

test("GET /api/dashboard with no active sprint → activeSprint is null", async () => {
  const res = await request(app).get("/api/dashboard");
  assertStatus(res, 200);
  assert.equal(res.body.data.activeSprint, null);
});

test("GET /api/dashboard velocity trend → max 5 sprints, sorted by completedAt desc", async () => {
  const base = new Date("2024-01-15T12:00:00.000Z").getTime();
  const sprints = [];
  for (let i = 0; i < 6; i++) {
    const completedAt = new Date(base + i * 86400000).toISOString();
    sprints.push(
      createSprint({
        name: `S${i}`,
        status: "completed",
        completedAt,
        velocityDataPoint: i + 1,
        startDate: "2024-01-01",
        endDate: "2024-01-10"
      })
    );
  }
  writeStore("sprints.json", sprints);

  const res = await request(app).get("/api/dashboard").expect(200);
  const trend = res.body.data.velocityTrend;
  assert.equal(trend.length, 5);
  const dates = trend.map((s: { completedAt: string }) => new Date(s.completedAt).getTime());
  const sorted = [...dates].sort((a, b) => b - a);
  assert.deepEqual(dates, sorted);
});

test("GET /api/dashboard overdue action items → only past-due incomplete", async () => {
  const m = createMember({ name: "Owner" });
  const sp = createSprint({ status: "completed", completedAt: "2023-01-01T00:00:00.000Z" });
  const retro = createRetro({ sprintId: sp.id });

  const past = new Date("2020-01-01T00:00:00.000Z").toISOString();
  const future = new Date("2099-01-01T00:00:00.000Z").toISOString();

  const items = [
    createActionItem({
      retroId: retro.id,
      sprintId: sp.id,
      ownerId: m.id,
      dueDate: past,
      status: "open",
      description: "Overdue open"
    }),
    createActionItem({
      retroId: retro.id,
      sprintId: sp.id,
      ownerId: m.id,
      dueDate: past,
      status: "complete",
      description: "Overdue but done"
    }),
    createActionItem({
      retroId: retro.id,
      sprintId: sp.id,
      ownerId: m.id,
      dueDate: future,
      status: "open",
      description: "Future"
    })
  ];

  writeStore("team-members.json", [m]);
  writeStore("sprints.json", [sp]);
  writeStore("retros.json", [retro]);
  writeStore("retro-action-items.json", items);
  writeStore("stories.json", []);

  const res = await request(app).get("/api/dashboard");
  assertStatus(res, 200);
  const overdue = res.body.data.retroSummary.overdueActionItems;
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].description, "Overdue open");
});
