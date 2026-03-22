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

test("GET /api/retros/:id includes carriedOverItems from earlier sprint retros", async () => {
  const member = await request(app).post("/api/team-members").send({
    name: "Owner",
    avatar: { color: "#111", initials: "O" },
    defaultAvailabilityDays: 10
  });
  assertStatus(member, 201);
  const memberId = member.body.data.id as string;

  const sprintEarly = await request(app).post("/api/sprints").send({
    name: "Sprint 1",
    startDate: "2025-01-06",
    endDate: "2025-01-17"
  });
  assertStatus(sprintEarly, 201);

  const retroEarly = await request(app).post("/api/retros").send({
    sprintId: sprintEarly.body.data.id,
    template: "start_stop_continue"
  });
  assertStatus(retroEarly, 201);
  const retroEarlyId = retroEarly.body.data.id as string;

  const ai = await request(app).post(`/api/retros/${retroEarlyId}/action-items`).send({
    description: "Carry me",
    ownerId: memberId,
    dueDate: "2025-02-01",
    status: "open"
  });
  assertStatus(ai, 201);

  const sprintLate = await request(app).post("/api/sprints").send({
    name: "Sprint 2",
    startDate: "2025-02-03",
    endDate: "2025-02-14"
  });
  assertStatus(sprintLate, 201);

  const retroLate = await request(app).post("/api/retros").send({
    sprintId: sprintLate.body.data.id,
    template: "4ls"
  });
  assertStatus(retroLate, 201);
  const retroLateId = retroLate.body.data.id as string;

  const detail = await request(app).get(`/api/retros/${retroLateId}`);
  assertStatus(detail, 200);
  const carried = detail.body.data.carriedOverItems;
  assert.ok(Array.isArray(carried));
  assert.equal(carried.length, 1);
  assert.equal(carried[0].description, "Carry me");
});

test("GET /api/retros?sprintId= filters list", async () => {
  const s = await request(app).post("/api/sprints").send({
    name: "Filter Sprint",
    startDate: "2025-03-03",
    endDate: "2025-03-14"
  });
  assertStatus(s, 201);
  const r = await request(app).post("/api/retros").send({
    sprintId: s.body.data.id,
    template: "mad_sad_glad"
  });
  assertStatus(r, 201);

  const list = await request(app).get("/api/retros").query({ sprintId: s.body.data.id });
  assertStatus(list, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].id, r.body.data.id);
});
