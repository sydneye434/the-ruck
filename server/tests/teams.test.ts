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

test("GET /api/teams → 200, returns array with depth", async () => {
  const res = await request(app).get("/api/teams");
  assertStatus(res, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("GET /api/teams/tree → 200", async () => {
  const res = await request(app).get("/api/teams/tree");
  assertStatus(res, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("POST /api/teams → 201, creates team", async () => {
  const res = await request(app).post("/api/teams").send({ name: "Platform" });
  assertStatus(res, 201);
  assert.equal(res.body.data.name, "Platform");
  assert.ok(res.body.data.id);
});

test("POST /api/teams missing name → 400", async () => {
  const res = await request(app).post("/api/teams").send({ description: "x" });
  assertStatus(res, 400);
});

test("POST /api/teams invalid parent → 400", async () => {
  const res = await request(app)
    .post("/api/teams")
    .send({ name: "Child", parentTeamId: "00000000-0000-4000-8000-000000000001" });
  assertStatus(res, 400);
});

test("PATCH /api/teams/:id circular parent → 400", async () => {
  const a = await request(app).post("/api/teams").send({ name: "A" });
  assertStatus(a, 201);
  const b = await request(app).post("/api/teams").send({ name: "B", parentTeamId: a.body.data.id });
  assertStatus(b, 201);
  const res = await request(app).patch(`/api/teams/${a.body.data.id}`).send({
    parentTeamId: b.body.data.id
  });
  assertStatus(res, 400);
  assert.match(res.body.error?.message ?? "", /Circular|circle/i);
});

test("DELETE /api/teams/:id?mode=single reparents children", async () => {
  const parent = await request(app).post("/api/teams").send({ name: "Parent" });
  assertStatus(parent, 201);
  const child = await request(app)
    .post("/api/teams")
    .send({ name: "Child", parentTeamId: parent.body.data.id });
  assertStatus(child, 201);

  const del = await request(app).delete(`/api/teams/${parent.body.data.id}`).query({ mode: "single" });
  assertStatus(del, 200);

  const tree = await request(app).get("/api/teams/tree");
  assertStatus(tree, 200);
  const roots = tree.body.data as { id: string; children: unknown[] }[];
  const childNode = roots.find((r) => r.id === child.body.data.id);
  assert.ok(childNode);
  assert.equal((childNode as { children: unknown[] }).children.length, 0);
});

test("DELETE /api/teams/:id invalid mode → 400", async () => {
  const t = await request(app).post("/api/teams").send({ name: "T" });
  assertStatus(t, 201);
  const res = await request(app).delete(`/api/teams/${t.body.data.id}`).query({ mode: "nope" });
  assertStatus(res, 400);
});
