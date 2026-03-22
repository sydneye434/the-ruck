// Developed by Sydney Edwards
/**
 * Exercises every api client method with a mocked fetch so request/del/withQuery paths stay covered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../src/lib/api";

function env(data: unknown) {
  return JSON.stringify({ data, error: null });
}

describe("api smoke (all methods)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("invokes every client method", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const u = String(url);
      if (method === "DELETE") {
        return { ok: true, status: 200, text: async () => env(null) } as Response;
      }
      if (u.includes("/dashboard")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              activeSprint: null,
              velocityTrend: [],
              teamSummary: {
                totalMembers: 0,
                activeMembers: 0,
                averageCapacityPercent: 0,
                membersAtReducedCapacity: []
              },
              retroSummary: {
                activeSprintRetro: null,
                totalOpenActionItems: 0,
                overdueActionItems: []
              },
              recentActivity: []
            })
        } as Response;
      }
      if (u.includes("/export")) {
        return {
          ok: true,
          status: 200,
          text: async () => env({ exportedAt: "", version: "1", data: {} })
        } as Response;
      }
      if (u.includes("/capacity-context")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              sprint: {
                id: "s",
                name: "S",
                goal: "",
                startDate: "2025-01-01",
                endDate: "2025-01-14",
                capacityTarget: null,
                capacitySnapshot: null
              },
              completedSprints: [],
              activeMembers: [],
              teams: [],
              memberships: [],
              workingDaysInSprint: 10
            })
        } as Response;
      }
      if (u.includes("/settings") && method === "GET") {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "s1",
              sprintLengthDays: 10,
              velocityWindow: 3,
              storyPointScale: "fibonacci",
              defaultRetroTemplate: "start_stop_continue",
              defaultAnonymous: false,
              dateFormat: "YYYY-MM-DD"
            })
        } as Response;
      }
      if (u.includes("/settings") && method === "PUT") {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "s1",
              sprintLengthDays: 12,
              velocityWindow: 3,
              storyPointScale: "fibonacci",
              defaultRetroTemplate: "start_stop_continue",
              defaultAnonymous: false,
              dateFormat: "YYYY-MM-DD"
            })
        } as Response;
      }
      if (u.includes("/complete")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "sp",
              name: "S",
              startDate: "2025-01-01",
              endDate: "2025-01-14",
              goal: "",
              status: "completed",
              completedAt: "2025-01-15",
              velocityDataPoint: 5
            })
        } as Response;
      }
      if (u.includes("/reset")) {
        return { ok: true, status: 200, text: async () => env({ message: "ok" }) } as Response;
      }
      if (u.includes("/retros/") && u.endsWith("/upvote")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "c1",
              retroId: "r1",
              columnKey: "start",
              content: "x",
              authorId: "m1",
              upvotes: [],
              groupId: null
            })
        } as Response;
      }
      if (u.includes("/group")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "c1",
              retroId: "r1",
              columnKey: "start",
              content: "x",
              authorId: "m1",
              upvotes: [],
              groupId: null
            })
        } as Response;
      }
      if (u.includes("/retros/") && u.includes("/action-items")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "a1",
              retroId: "r1",
              description: "d",
              ownerId: null,
              dueDate: null,
              status: "open",
              carriedOverFromId: null,
              sprintId: "s1"
            })
        } as Response;
      }
      if (u.includes("/retros/") && u.includes("/cards") && !u.includes("upvote")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              id: "c1",
              retroId: "r1",
              columnKey: "start",
              content: "x",
              authorId: "m1",
              upvotes: [],
              groupId: null
            })
        } as Response;
      }
      if (u.includes("/retros/") && !u.includes("/cards") && !u.includes("/action-items")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              retro: {
                id: "r1",
                sprintId: "s1",
                title: "R",
                template: "start_stop_continue",
                phase: "reflect",
                isAnonymous: false
              },
              columns: [],
              cards: [],
              actionItems: [],
              carriedOverItems: []
            })
        } as Response;
      }
      if (u.includes("/retros") && !u.includes("/retros/")) {
        return {
          ok: true,
          status: 200,
          text: async () => env([{ id: "r1", sprintId: "s1", openActionItemCount: 0 }])
        } as Response;
      }
      if (u.includes("/burndown")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            env({
              sprint: {
                id: "s1",
                name: "S",
                startDate: "2025-01-01",
                endDate: "2025-01-14",
                capacityTarget: null
              },
              snapshots: [],
              idealBurndown: [
                { date: "2025-01-01", idealRemaining: 10 },
                { date: "2025-01-02", idealRemaining: 0 }
              ],
              projectedCompletion: { date: null, status: null, daysDeltaVsEnd: null },
              projectedLine: []
            })
        } as Response;
      }
      return { ok: true, status: 200, text: async () => env({ id: "x", name: "n" }) } as Response;
    });

    await api.teamMembers.getAll();
    await api.teamMembers.getById("m1");
    await api.teamMembers.create({ name: "A" } as any);
    await api.teamMembers.update("m1", { name: "B" } as any);
    await api.teamMembers.deactivate("m1");
    await api.teamMembers.reactivate("m1");
    await api.teamMembers.delete("m1");

    await api.teams.getAll();
    await api.teams.getTree();
    await api.teams.getMemberships();
    await api.teams.getMembersForTeam("t1");
    await api.teams.create({ name: "T" } as any);
    await api.teams.update("t1", { name: "T2" } as any);
    await api.teams.delete("t1", "single");
    await api.teams.delete("t1", "cascade");
    await api.teams.addMember("t1", "m1");
    await api.teams.removeMember("t1", "m1");

    await api.sprints.getAll();
    await api.sprints.getById("s1");
    await api.sprints.create({ name: "S" } as any);
    await api.sprints.update("s1", { name: "S2" } as any);
    await api.sprints.getCapacityContext("s1");
    await api.sprints.getBurndown("s1");
    await api.sprints.complete("s1");
    await api.sprints.delete("s1");

    await api.stories.getAll();
    await api.stories.getAll({ sprintId: "backlog" });
    await api.stories.getById("st1");
    await api.stories.create({ title: "T", sprintId: "s1", storyPoints: 5, boardColumn: "backlog" } as any);
    await api.stories.update("st1", { title: "T2" } as any);
    await api.stories.delete("st1");

    await api.retros.getAll();
    await api.retros.getById("r1");
    await api.retros.create({ sprintId: "s1", template: "4ls" } as any);
    await api.retros.update("r1", { title: "R" } as any);
    await api.retros.delete("r1");

    await api.retros.cards.getAll("r1");
    await api.retros.cards.getById("r1", "c1");
    await api.retros.cards.create("r1", { content: "x", columnKey: "start", authorId: "m1" } as any);
    await api.retros.cards.update("r1", "c1", { content: "y" } as any);
    await api.retros.cards.upvote("r1", "c1", "m1");
    await api.retros.cards.group("r1", "c1", null);
    await api.retros.cards.delete("r1", "c1");

    await api.retros.actionItems.getAll("r1");
    await api.retros.actionItems.getById("r1", "a1");
    await api.retros.actionItems.create("r1", { description: "d", status: "open" } as any);
    await api.retros.actionItems.update("r1", "a1", { description: "e" } as any);
    await api.retros.actionItems.delete("r1", "a1");

    await api.settings.get();
    await api.settings.update({
      id: "s1",
      sprintLengthDays: 12,
      velocityWindow: 3,
      storyPointScale: "fibonacci",
      defaultRetroTemplate: "start_stop_continue",
      defaultAnonymous: false,
      dateFormat: "YYYY-MM-DD"
    } as any);

    await api.data.exportAll();
    await api.data.resetAll();

    await api.dashboard.get();

    expect(fetchMock.mock.calls.length).toBeGreaterThan(30);
  });
});
