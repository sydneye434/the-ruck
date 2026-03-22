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

test("GET /api/team-members → 200, returns array", async () => {
  const res = await request(app).get("/api/team-members");
  assertStatus(res, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("POST /api/team-members → 201, creates member, returns it", async () => {
  const res = await request(app)
    .post("/api/team-members")
    .send({
      name: "Alex",
      avatar: { color: "#111", initials: "A" },
      defaultAvailabilityDays: 10
    });
  assertStatus(res, 201);
  assert.equal(res.body.data.name, "Alex");
  assert.ok(res.body.data.id);
});

test("POST /api/team-members missing name → 400 with error message", async () => {
  const res = await request(app)
    .post("/api/team-members")
    .send({
      avatar: { color: "#111", initials: "A" },
      defaultAvailabilityDays: 10
    });
  assertStatus(res, 400);
  assert.ok(String(res.body.error?.message).length > 0);
});

test("POST /api/team-members capacity > 100 → 400", async () => {
  const res = await request(app)
    .post("/api/team-members")
    .send({
      name: "Bad Cap",
      avatar: { color: "#111", initials: "B" },
      defaultAvailabilityDays: 10,
      capacityMultiplier: 101
    });
  assertStatus(res, 400);
  assert.match(res.body.error?.message ?? "", /capacityMultiplier/i);
});

test("GET /api/team-members/:id → 200 with correct member", async () => {
  const created = await request(app)
    .post("/api/team-members")
    .send({
      name: "Pat",
      avatar: { color: "#222", initials: "P" },
      defaultAvailabilityDays: 8
    });
  assertStatus(created, 201);
  const id = created.body.data.id;
  const res = await request(app).get(`/api/team-members/${id}`);
  assertStatus(res, 200);
  assert.equal(res.body.data.id, id);
  assert.equal(res.body.data.name, "Pat");
});

test("GET /api/team-members/:id nonexistent → 404", async () => {
  const res = await request(app).get("/api/team-members/00000000-0000-4000-8000-000000000000");
  assertStatus(res, 404);
});

test("PATCH /api/team-members/:id → 200, updates correctly", async () => {
  const created = await request(app)
    .post("/api/team-members")
    .send({
      name: "Sam",
      avatar: { color: "#333", initials: "S" },
      defaultAvailabilityDays: 10
    });
  assertStatus(created, 201);
  const id = created.body.data.id;
  const res = await request(app).patch(`/api/team-members/${id}`).send({ name: "Samuel" });
  assertStatus(res, 200);
  assert.equal(res.body.data.name, "Samuel");
});

test("DELETE /api/team-members/:id → 200, member no longer returned", async () => {
  const created = await request(app)
    .post("/api/team-members")
    .send({
      name: "DelMe",
      avatar: { color: "#444", initials: "D" },
      defaultAvailabilityDays: 10
    });
  assertStatus(created, 201);
  const id = created.body.data.id;
  const del = await request(app).delete(`/api/team-members/${id}`);
  assertStatus(del, 200);
  const res = await request(app).get(`/api/team-members/${id}`);
  assertStatus(res, 404);
});
