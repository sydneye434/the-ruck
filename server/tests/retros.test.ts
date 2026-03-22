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

async function member() {
  const res = await request(app).post("/api/team-members").send({
    name: "Retro Author",
    avatar: { color: "#abc", initials: "R" },
    defaultAvailabilityDays: 10
  });
  assertStatus(res, 201);
  return res.body.data.id as string;
}

async function sprint() {
  const res = await request(app).post("/api/sprints").send({
    name: "Retro Sprint",
    startDate: "2025-11-03",
    endDate: "2025-11-14"
  });
  assertStatus(res, 201);
  return res.body.data.id as string;
}

test("POST /api/retros → 201", async () => {
  const sprintId = await sprint();
  const res = await request(app)
    .post("/api/retros")
    .send({
      sprintId,
      template: "start_stop_continue",
      title: "R1"
    });
  assertStatus(res, 201);
  assert.ok(res.body.data.id);
});

test("POST /api/retros duplicate sprintId → 400 with already exists message", async () => {
  const sprintId = await sprint();
  const first = await request(app).post("/api/retros").send({ sprintId, template: "4ls" });
  assertStatus(first, 201);

  const dup = await request(app).post("/api/retros").send({ sprintId, template: "mad_sad_glad" });
  assertStatus(dup, 400);
  assert.match(dup.body.error?.message ?? "", /already exists/i);
});

test("POST /api/retros invalid sprintId → 400", async () => {
  const res = await request(app).post("/api/retros").send({
    sprintId: "00000000-0000-4000-8000-000000000001",
    template: "start_stop_continue"
  });
  assertStatus(res, 400);
  assert.match(res.body.error?.message ?? "", /exist/i);
});

test("GET /api/retros/:id → embeds cards and actionItems", async () => {
  const sprintId = await sprint();
  const authorId = await member();
  const retro = await request(app).post("/api/retros").send({ sprintId, template: "start_stop_continue" });
  assertStatus(retro, 201);
  const retroId = retro.body.data.id as string;

  const cardRes = await request(app).post(`/api/retros/${retroId}/cards`).send({
    content: "Hello",
    authorId,
    columnKey: "start"
  });
  assertStatus(cardRes, 201);

  const ai = await request(app).post(`/api/retros/${retroId}/action-items`).send({
    description: "Fix it",
    ownerId: authorId,
    dueDate: null,
    status: "open"
  });
  assertStatus(ai, 201);

  const detail = await request(app).get(`/api/retros/${retroId}`);
  assertStatus(detail, 200);
  assert.equal(detail.body.data.retro.id, retroId);
  assert.ok(Array.isArray(detail.body.data.cards));
  assert.ok(Array.isArray(detail.body.data.actionItems));
  assert.equal(detail.body.data.cards.length, 1);
  assert.equal(detail.body.data.actionItems.length, 1);
});

test("POST /api/retros/:id/cards invalid columnKey → 400", async () => {
  const sprintId = await sprint();
  const authorId = await member();
  const retro = await request(app).post("/api/retros").send({ sprintId, template: "start_stop_continue" });
  assertStatus(retro, 201);
  const retroId = retro.body.data.id as string;

  const bad = await request(app).post(`/api/retros/${retroId}/cards`).send({
    content: "Nope",
    authorId,
    columnKey: "not_a_column"
  });
  assertStatus(bad, 400);
  assert.match(bad.body.error?.message ?? "", /column/i);
});

test("POST /api/retros/:id/cards/:cardId/upvote toggles (idempotent second call removes)", async () => {
  const sprintId = await sprint();
  const authorId = await member();
  const voterId = await member();
  const retro = await request(app).post("/api/retros").send({ sprintId, template: "start_stop_continue" });
  assertStatus(retro, 201);
  const retroId = retro.body.data.id as string;

  const card = await request(app).post(`/api/retros/${retroId}/cards`).send({
    content: "Vote me",
    authorId,
    columnKey: "start"
  });
  assertStatus(card, 201);
  const cardId = card.body.data.id as string;

  const first = await request(app)
    .post(`/api/retros/${retroId}/cards/${cardId}/upvote`)
    .send({ memberId: voterId });
  assertStatus(first, 200);
  assert.ok(first.body.data.upvotes.includes(voterId));

  const second = await request(app)
    .post(`/api/retros/${retroId}/cards/${cardId}/upvote`)
    .send({ memberId: voterId });
  assertStatus(second, 200);
  assert.ok(!second.body.data.upvotes.includes(voterId));
});

test("PATCH /api/retros/:id phase advance → updates phase", async () => {
  const sprintId = await sprint();
  const retro = await request(app).post("/api/retros").send({ sprintId, template: "4ls" });
  assertStatus(retro, 201);
  const retroId = retro.body.data.id as string;

  const next = await request(app).patch(`/api/retros/${retroId}`).send({ phase: "discuss" });
  assertStatus(next, 200);
  assert.equal(next.body.data.phase, "discuss");
});
