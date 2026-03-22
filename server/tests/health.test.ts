// Developed by Sydney Edwards
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";
import { seedEmptyStores, wipeTestDataDir } from "./testData.js";
import { assertStatus } from "./assertResponse";

const app = createApp();

before(() => {
  wipeTestDataDir();
  seedEmptyStores();
});

after(() => {
  wipeTestDataDir();
});

test("GET /api/sprints/:id/health → 200, five components, total equals sum", async () => {
  const sprintRes = await request(app)
    .post("/api/sprints")
    .send({
      name: "Health sprint",
      startDate: "2025-03-03",
      endDate: "2025-03-14",
      status: "active",
      capacityTarget: 20
    });
  assertStatus(sprintRes, 201);
  const sprintId = sprintRes.body.data.id;

  await request(app).post("/api/stories").send({
    sprintId,
    title: "One",
    storyPoints: 5,
    boardColumn: "done",
    description: ""
  });

  const res = await request(app).get(`/api/sprints/${sprintId}/health`);
  assertStatus(res, 200);
  const payload = res.body.data;
  assert.ok(payload.healthScore);
  assert.ok(payload.calculatedAt);
  assert.ok(Array.isArray(payload.history));

  const { healthScore } = payload;
  const keys = [
    "velocityAdherence",
    "scopeStability",
    "capacityAlignment",
    "teamAvailability",
    "retroHealth"
  ] as const;
  let sum = 0;
  for (const k of keys) {
    const c = healthScore.components[k];
    assert.ok(c);
    assert.equal(typeof c.score, "number");
    assert.equal(c.max, 20);
    assert.equal(typeof c.label, "string");
    assert.equal(typeof c.detail, "string");
    assert.ok(c.detail.length > 0, `${k} detail should be human-readable`);
    sum += c.score;
  }
  assert.equal(healthScore.total, sum);
  assert.equal(typeof healthScore.grade, "string");
  assert.ok(["up", "down", "stable", "insufficient_data"].includes(healthScore.trend));
});
