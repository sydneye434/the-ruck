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

test("GET /api/stories?sprintId=backlog → only backlog stories", async () => {
  const sprint = await request(app)
    .post("/api/sprints")
    .send({
      name: "S",
      startDate: "2025-05-01",
      endDate: "2025-05-14"
    });
  assertStatus(sprint, 201);

  const s1 = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    title: "In sprint backlog column",
    storyPoints: 3,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(s1, 201);

  const s2 = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    title: "In progress",
    storyPoints: 5,
    boardColumn: "in_progress",
    description: ""
  });
  assertStatus(s2, 201);

  const res = await request(app).get("/api/stories?sprintId=backlog");
  assertStatus(res, 200);
  const titles = res.body.data.map((s: { title: string }) => s.title);
  assert.ok(titles.includes("In sprint backlog column"));
  assert.ok(!titles.includes("In progress"));
});

test("GET /api/stories?sprintId=:id → only that sprint's stories", async () => {
  const a = await request(app)
    .post("/api/sprints")
    .send({ name: "A", startDate: "2025-06-02", endDate: "2025-06-13" });
  assertStatus(a, 201);
  const b = await request(app)
    .post("/api/sprints")
    .send({ name: "B", startDate: "2025-06-16", endDate: "2025-06-27" });
  assertStatus(b, 201);

  const s1 = await request(app).post("/api/stories").send({
    sprintId: a.body.data.id,
    title: "Only A",
    storyPoints: 2,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(s1, 201);

  const s2 = await request(app).post("/api/stories").send({
    sprintId: b.body.data.id,
    title: "Only B",
    storyPoints: 3,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(s2, 201);

  const res = await request(app).get(`/api/stories?sprintId=${a.body.data.id}`);
  assertStatus(res, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].title, "Only A");
});

test("POST /api/stories → 201", async () => {
  const sprint = await request(app)
    .post("/api/sprints")
    .send({ name: "S2", startDate: "2025-07-01", endDate: "2025-07-12" });
  assertStatus(sprint, 201);

  const res = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    title: "New",
    storyPoints: 5,
    boardColumn: "backlog",
    description: "d"
  });
  assertStatus(res, 201);
  assert.equal(res.body.data.title, "New");
});

test("POST /api/stories missing title → 400", async () => {
  const sprint = await request(app)
    .post("/api/sprints")
    .send({ name: "S3", startDate: "2025-08-04", endDate: "2025-08-15" });
  assertStatus(sprint, 201);

  const res = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    storyPoints: 5,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(res, 400);
});

test("POST /api/stories missing storyPoints → 400", async () => {
  const sprint = await request(app)
    .post("/api/sprints")
    .send({ name: "S4", startDate: "2025-09-01", endDate: "2025-09-12" });
  assertStatus(sprint, 201);

  const res = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    title: "No points",
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(res, 400);
});

test("POST/PATCH story assigned to active sprint sets sprintAddedAt", async () => {
  const planning = await request(app)
    .post("/api/sprints")
    .send({
      name: "Planning",
      startDate: "2026-01-05",
      endDate: "2026-01-16",
      status: "planning"
    });
  assertStatus(planning, 201);

  const active = await request(app)
    .post("/api/sprints")
    .send({
      name: "Active",
      startDate: "2026-01-19",
      endDate: "2026-01-30",
      status: "active"
    });
  assertStatus(active, 201);
  const activeId = active.body.data.id;

  const created = await request(app).post("/api/stories").send({
    sprintId: activeId,
    title: "Born in active",
    storyPoints: 3,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(created, 201);
  assert.ok(created.body.data.sprintAddedAt);

  const fromPlanning = await request(app).post("/api/stories").send({
    sprintId: planning.body.data.id,
    title: "Started in planning",
    storyPoints: 2,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(fromPlanning, 201);
  assert.equal(fromPlanning.body.data.sprintAddedAt ?? null, null);

  const moved = await request(app)
    .patch(`/api/stories/${fromPlanning.body.data.id}`)
    .send({ sprintId: activeId });
  assertStatus(moved, 200);
  assert.ok(moved.body.data.sprintAddedAt);
});

test("PATCH /api/stories/:id boardColumn → 200, column updated", async () => {
  const sprint = await request(app)
    .post("/api/sprints")
    .send({ name: "S5", startDate: "2025-10-06", endDate: "2025-10-17" });
  assertStatus(sprint, 201);

  const story = await request(app).post("/api/stories").send({
    sprintId: sprint.body.data.id,
    title: "Move me",
    storyPoints: 1,
    boardColumn: "backlog",
    description: ""
  });
  assertStatus(story, 201);

  const patched = await request(app)
    .patch(`/api/stories/${story.body.data.id}`)
    .send({ boardColumn: "done" });
  assertStatus(patched, 200);
  assert.equal(patched.body.data.boardColumn, "done");
});
