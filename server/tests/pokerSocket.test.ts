// Developed by Sydney Edwards
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as clientIo, type Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import { createApp } from "../src/app";
import { clearPokerSessionsForTests, getPokerSession, getPokerSessionCount } from "../src/poker/sessionStore";
import { initPokerSocket } from "../src/sockets/pokerSocket";
import { seedEmptyStores, wipeTestDataDir } from "./testData.js";

let httpServer: http.Server;
let io: Server;
let port: number;
let requestAgent: ReturnType<typeof request>;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function connectClient(): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const s = clientIo(`http://127.0.0.1:${port}`, { transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

before(async () => {
  wipeTestDataDir();
  seedEmptyStores();
  clearPokerSessionsForTests();

  const app = createApp();
  httpServer = http.createServer(app);
  io = new Server(httpServer, { cors: { origin: "*" } });
  initPokerSocket(io);
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(0, () => resolve());
    httpServer.on("error", reject);
  });
  const addr = httpServer.address() as AddressInfo;
  port = addr.port;
  requestAgent = request(httpServer);
});

after(() => {
  clearPokerSessionsForTests();
  io.close();
  httpServer.close();
  wipeTestDataDir();
});

async function createActiveSprintWithStories() {
  const sprintRes = await requestAgent
    .post("/api/sprints")
    .send({
      name: "Poker sprint",
      startDate: "2026-02-02",
      endDate: "2026-02-13",
      status: "active"
    });
  assert.equal(sprintRes.status, 201);
  const sprintId = sprintRes.body.data.id;

  const storyRes = await requestAgent.post("/api/stories").send({
    sprintId,
    title: "Estimate me",
    storyPoints: null,
    boardColumn: "backlog",
    description: ""
  });
  assert.equal(storyRes.status, 201);
  const storyId = storyRes.body.data.id;

  const story2 = await requestAgent.post("/api/stories").send({
    sprintId,
    title: "Second",
    storyPoints: null,
    boardColumn: "backlog",
    description: ""
  });
  assert.equal(story2.status, 201);

  return { sprintId, storyId, story2Id: story2.body.data.id };
}

test("POST /api/poker/sessions → session in memory", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m-fac",
    memberName: "Facilitator",
    avatarColor: "#ff0000"
  });
  assert.equal(res.status, 201);
  const sessionId = res.body.data.sessionId;
  assert.ok(getPokerSession(sessionId));
  assert.equal(getPokerSession(sessionId)?.facilitatorMemberId, "m-fac");
});

test("Two socket clients join → two participants", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  const s2 = await connectClient();
  s1.emit("session:join", {
    sessionId,
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111111"
  });
  s2.emit("session:join", {
    sessionId,
    memberId: "m2",
    memberName: "Two",
    avatarColor: "#222222"
  });
  await delay(200);

  const sess = getPokerSession(sessionId);
  assert.equal(sess?.participants.length, 2);
  s1.disconnect();
  s2.disconnect();
});

test("Vote hidden to other participant before reveal", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  const s2 = await connectClient();

  let lastP2: { participants: { memberId: string; vote: unknown }[] } | null = null;
  s2.on("session:updated", (p: { participants: { memberId: string; vote: unknown }[] }) => {
    lastP2 = p;
  });

  s1.emit("session:join", { sessionId, memberId: "m1", memberName: "One", avatarColor: "#111" });
  s2.emit("session:join", { sessionId, memberId: "m2", memberName: "Two", avatarColor: "#222" });
  await delay(200);

  s1.emit("session:vote", { sessionId, memberId: "m1", vote: 8 });
  await delay(200);

  const m1FromP2 = lastP2?.participants.find((p) => p.memberId === "m1");
  assert.equal(m1FromP2?.vote, null, "other client must not see vote value before reveal");

  s1.disconnect();
  s2.disconnect();
});

test("Facilitator reveal → votes visible in state", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  const s2 = await connectClient();
  s1.emit("session:join", { sessionId, memberId: "m1", memberName: "One", avatarColor: "#111" });
  s2.emit("session:join", { sessionId, memberId: "m2", memberName: "Two", avatarColor: "#222" });
  await delay(150);
  s1.emit("session:vote", { sessionId, memberId: "m1", vote: 5 });
  s2.emit("session:vote", { sessionId, memberId: "m2", vote: 5 });
  await delay(150);

  s1.emit("session:reveal", { sessionId });
  await delay(200);

  const sess = getPokerSession(sessionId);
  assert.equal(sess?.phase, "revealed");
  assert.equal(sess?.votes["m1"], 5);
  assert.equal(sess?.votes["m2"], 5);

  s1.disconnect();
  s2.disconnect();
});

test("session:agree updates story points and advances queue", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId, story2Id } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId, story2Id],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  s1.emit("session:join", { sessionId, memberId: "m1", memberName: "One", avatarColor: "#111" });
  await delay(150);
  s1.emit("session:vote", { sessionId, memberId: "m1", vote: 3 });
  await delay(100);
  s1.emit("session:reveal", { sessionId });
  await delay(100);

  await new Promise<void>((resolve, reject) => {
    s1.emit("session:agree", { sessionId, points: 3 }, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const st = await requestAgent.get(`/api/stories/${storyId}`);
  assert.equal(st.body.data.storyPoints, 3);

  const sess = getPokerSession(sessionId);
  assert.equal(sess?.currentStoryId, story2Id);

  s1.disconnect();
});

test("Last story agreed → phase complete", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  s1.emit("session:join", { sessionId, memberId: "m1", memberName: "One", avatarColor: "#111" });
  await delay(150);
  s1.emit("session:vote", { sessionId, memberId: "m1", vote: 2 });
  await delay(100);
  s1.emit("session:reveal", { sessionId });
  await delay(100);

  await new Promise<void>((resolve, reject) => {
    s1.emit("session:agree", { sessionId, points: 2 }, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  assert.equal(getPokerSession(sessionId)?.phase, "complete");
  s1.disconnect();
});

test("Solo client disconnect → session destroyed", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "solo",
    memberName: "Solo",
    avatarColor: "#000"
  });
  const sessionId = res.body.data.sessionId;

  const c = await connectClient();
  c.emit("session:join", {
    sessionId,
    memberId: "solo",
    memberName: "Solo",
    avatarColor: "#000"
  });
  await delay(150);
  assert.ok(getPokerSession(sessionId));

  c.disconnect();
  await delay(250);
  assert.equal(getPokerSession(sessionId), undefined);
  assert.equal(getPokerSessionCount(), 0);
});

test("Facilitator disconnect → role moves to next participant", async () => {
  clearPokerSessionsForTests();
  const { sprintId, storyId } = await createActiveSprintWithStories();
  const res = await requestAgent.post("/api/poker/sessions").send({
    sprintId,
    storyQueue: [storyId],
    memberId: "m1",
    memberName: "One",
    avatarColor: "#111"
  });
  const sessionId = res.body.data.sessionId;

  const s1 = await connectClient();
  const s2 = await connectClient();
  s1.emit("session:join", { sessionId, memberId: "m1", memberName: "One", avatarColor: "#111" });
  s2.emit("session:join", { sessionId, memberId: "m2", memberName: "Two", avatarColor: "#222" });
  await delay(200);

  let fac = getPokerSession(sessionId)?.facilitatorMemberId;
  assert.equal(fac, "m1");

  s1.disconnect();
  await delay(250);

  fac = getPokerSession(sessionId)?.facilitatorMemberId;
  assert.equal(fac, "m2");

  s2.disconnect();
  await delay(250);
});
