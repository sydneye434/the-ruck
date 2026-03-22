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

test("GET /api/health → 200", async () => {
  const res = await request(app).get("/api/health");
  assertStatus(res, 200);
  assert.equal(res.body.data?.status, "ok");
});

test("GET / serves HTML landing", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
  assert.match(res.text ?? "", /The Ruck API/);
});

test("GET /api/docs/openapi.json → 200", async () => {
  const res = await request(app).get("/api/docs/openapi.json");
  assertStatus(res, 200);
  assert.ok(res.body.openapi || res.body.swagger);
});

test("GET /api/export → snapshot payload", async () => {
  const res = await request(app).get("/api/export");
  assertStatus(res, 200);
  assert.ok(res.body.data?.exportedAt);
  assert.ok(res.body.data?.data?.teamMembers);
});

test("GET /api/nope → 404 envelope", async () => {
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, "NOT_FOUND");
});
