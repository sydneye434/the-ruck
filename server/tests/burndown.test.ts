// Developed by Sydney Edwards
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";
import { seedEmptyStores, wipeTestDataDir } from "./testData.js";
import { assertStatus } from "./assertResponse";
import { sprintDaySnapshotRepository } from "../src/repositories/sprintDaySnapshotRepository";
import { recordBurndownSnapshotForSprintAsync } from "../src/services/burndownSnapshotService";

const app = createApp();

before(() => {
  wipeTestDataDir();
  seedEmptyStores();
});

after(() => {
  wipeTestDataDir();
});

test("GET /api/sprints/:id/burndown → correct shape and Mon–Fri ideal", async () => {
  const sprintRes = await request(app).post("/api/sprints").send({
    name: "B Test",
    startDate: "2025-06-02",
    endDate: "2025-06-13",
    goal: "",
    status: "active"
  });
  assertStatus(sprintRes, 201);
  const sprintId = sprintRes.body.data.id as string;

  await request(app).post("/api/stories").send({
    sprintId,
    title: "A",
    storyPoints: 5,
    boardColumn: "backlog",
    description: ""
  });

  const res = await request(app).get(`/api/sprints/${sprintId}/burndown`);
  assertStatus(res, 200);
  const d = res.body.data;
  assert.ok(d.sprint);
  assert.ok(Array.isArray(d.idealBurndown));
  assert.ok(Array.isArray(d.snapshots));
  assert.ok(d.projectedCompletion);
  assert.ok("projectedLine" in d);
  for (const row of d.idealBurndown) {
    const day = new Date(row.date + "T12:00:00").getDay();
    assert.notEqual(day, 0);
    assert.notEqual(day, 6);
  }
});

test("snapshot upsert: same calendar day → one row", async () => {
  const sprintRes = await request(app).post("/api/sprints").send({
    name: "Upsert",
    startDate: "2025-07-01",
    endDate: "2025-07-15",
    goal: "",
    status: "active"
  });
  assertStatus(sprintRes, 201);
  const sprintId = sprintRes.body.data.id as string;

  await recordBurndownSnapshotForSprintAsync(sprintId);
  await recordBurndownSnapshotForSprintAsync(sprintId);

  const all = await sprintDaySnapshotRepository.getAll();
  const forSprint = all.filter((s) => s.sprintId === sprintId);
  assert.equal(forSprint.length, 1);
});
