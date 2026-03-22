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

test("GET /api/sprints → 200, returns array", async () => {
  const res = await request(app).get("/api/sprints");
  assertStatus(res, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("POST /api/sprints → 201, creates sprint", async () => {
  const res = await request(app)
    .post("/api/sprints")
    .send({
      name: "Sprint A",
      startDate: "2025-02-03",
      endDate: "2025-02-14",
      goal: "Ship"
    });
  assertStatus(res, 201);
  assert.equal(res.body.data.name, "Sprint A");
});

test("POST /api/sprints missing name → 400", async () => {
  const res = await request(app)
    .post("/api/sprints")
    .send({
      startDate: "2025-02-03",
      endDate: "2025-02-14"
    });
  assertStatus(res, 400);
});

test("POST /api/sprints endDate before startDate → 400", async () => {
  const res = await request(app)
    .post("/api/sprints")
    .send({
      name: "Bad dates",
      startDate: "2025-02-14",
      endDate: "2025-02-03"
    });
  assertStatus(res, 400);
  assert.match(res.body.error?.message ?? "", /endDate/i);
});

test("POST /api/sprints/:id/complete calculates velocity and sets completed fields", async () => {
  const sprintRes = await request(app)
    .post("/api/sprints")
    .send({
      name: "Complete me",
      startDate: "2025-03-03",
      endDate: "2025-03-14",
      status: "active"
    });
  assertStatus(sprintRes, 201);
  const sprintId = sprintRes.body.data.id;

  const st1 = await request(app).post("/api/stories").send({
    sprintId,
    title: "Done story",
    storyPoints: 8,
    boardColumn: "done",
    description: ""
  });
  assertStatus(st1, 201);

  const st2 = await request(app).post("/api/stories").send({
    sprintId,
    title: "In progress",
    storyPoints: 3,
    boardColumn: "in_progress",
    description: ""
  });
  assertStatus(st2, 201);

  const complete = await request(app).post(`/api/sprints/${sprintId}/complete`);
  assertStatus(complete, 200);
  assert.equal(complete.body.data.status, "completed");
  assert.equal(complete.body.data.velocityDataPoint, 8);
  assert.ok(complete.body.data.completedAt);
  assert.equal(complete.body.meta?.velocityDataPoint, 8);
});

test("POST /api/sprints/:id/complete on already-completed sprint → 400", async () => {
  const sprintRes = await request(app)
    .post("/api/sprints")
    .send({
      name: "Done sprint",
      startDate: "2025-04-01",
      endDate: "2025-04-12"
    });
  assertStatus(sprintRes, 201);
  const sprintId = sprintRes.body.data.id;

  const firstComplete = await request(app).post(`/api/sprints/${sprintId}/complete`);
  assertStatus(firstComplete, 200);
  const second = await request(app).post(`/api/sprints/${sprintId}/complete`);
  assertStatus(second, 400);
  assert.match(second.body.error?.message ?? "", /already completed/i);
});
