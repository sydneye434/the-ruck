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

test("GET /api/settings → 200, all default keys present", async () => {
  const res = await request(app).get("/api/settings");
  assertStatus(res, 200);
  const s = res.body.data;
  assert.ok(typeof s.sprintLengthDays === "number");
  assert.ok([1, 2, 3, 5].includes(s.velocityWindow));
  assert.ok(s.storyPointScale);
  assert.ok(s.defaultRetroTemplate);
  assert.ok(typeof s.defaultAnonymous === "boolean");
  assert.ok(s.dateFormat);
});

test("PUT /api/settings → 200, persists changes", async () => {
  const res = await request(app).put("/api/settings").send({
    sprintLengthDays: 12,
    velocityWindow: 5,
    storyPointScale: "tshirt",
    defaultRetroTemplate: "4ls",
    defaultAnonymous: true,
    dateFormat: "YYYY-MM-DD"
  });
  assertStatus(res, 200);
});

test("GET /api/settings after PUT → returns updated values", async () => {
  const put = await request(app).put("/api/settings").send({
    sprintLengthDays: 14,
    velocityWindow: 2,
    storyPointScale: "fibonacci",
    defaultRetroTemplate: "mad_sad_glad",
    defaultAnonymous: false,
    dateFormat: "DD/MM/YYYY"
  });
  assertStatus(put, 200);

  const res = await request(app).get("/api/settings");
  assertStatus(res, 200);
  assert.equal(res.body.data.sprintLengthDays, 14);
  assert.equal(res.body.data.velocityWindow, 2);
  assert.equal(res.body.data.defaultRetroTemplate, "mad_sad_glad");
});

test("PUT /api/settings invalid storyPointScale → 400", async () => {
  const res = await request(app).put("/api/settings").send({ storyPointScale: "invalid_scale" });
  assertStatus(res, 400);
  assert.match(res.body.error?.message ?? "", /storyPointScale/i);
});
