// Developed by Sydney Edwards
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHealthScore,
  gradeFromTotal,
  scoreCapacityAlignment,
  scoreScopeStability,
  scoreVelocityAdherence
} from "./healthScore";
import type { Retro, RetroActionItem, Sprint, SprintDaySnapshot, Story } from "./types/domain";

const baseSprint: Pick<Sprint, "id" | "startDate" | "endDate" | "capacityTarget" | "capacitySnapshot"> = {
  id: "s1",
  startDate: "2025-01-06",
  endDate: "2025-01-17",
  capacityTarget: 50,
  capacitySnapshot: { teamAvailabilityRatio: 0.96 }
};

function story(over: Partial<Story> & Pick<Story, "id" | "sprintId" | "storyPoints" | "boardColumn">): Story {
  return {
    title: "T",
    description: "",
    assigneeMemberId: null,
    labels: [],
    acceptanceCriteria: [],
    ...over
  };
}

test("velocityAdherence: ratio 1.0 → 20 pts", () => {
  const r = scoreVelocityAdherence({
    completedPoints: 50,
    totalPoints: 50,
    sprintStart: "2025-01-06",
    sprintEnd: "2025-01-17",
    capacityTarget: 50,
    asOfDateYmd: "2025-01-17"
  });
  assert.equal(r.score, 20);
});

test("velocityAdherence: ratio ~0.82 → 15 pts", () => {
  const r = scoreVelocityAdherence({
    completedPoints: 41,
    totalPoints: 50,
    sprintStart: "2025-01-06",
    sprintEnd: "2025-01-20",
    capacityTarget: 50,
    asOfDateYmd: "2025-01-20"
  });
  assert.equal(r.score, 15);
});

test("velocityAdherence: ratio 0.40 → 0 pts", () => {
  const r = scoreVelocityAdherence({
    completedPoints: 20,
    totalPoints: 50,
    sprintStart: "2025-01-06",
    sprintEnd: "2025-01-20",
    capacityTarget: 50,
    asOfDateYmd: "2025-01-20"
  });
  assert.equal(r.score, 0);
});

test("velocityAdherence: workingElapsed 0 → 10 pts neutral", () => {
  const r = scoreVelocityAdherence({
    completedPoints: 0,
    totalPoints: 10,
    sprintStart: "2030-01-06",
    sprintEnd: "2030-01-17",
    capacityTarget: 50,
    asOfDateYmd: "2029-12-01"
  });
  assert.equal(r.score, 10);
});

test("scopeStability: none added after start → 20 pts", () => {
  const stories: Story[] = [
    story({
      id: "a",
      sprintId: "s1",
      storyPoints: 3,
      boardColumn: "backlog",
      sprintAddedAt: "2025-01-06T12:00:00.000Z"
    })
  ];
  const r = scoreScopeStability(stories, "2025-01-06");
  assert.equal(r.score, 20);
});

test("scopeStability: 2 added, 10 original → 12 pts (20% creep)", () => {
  const stories: Story[] = [];
  for (let i = 0; i < 10; i++) {
    stories.push(
      story({
        id: `o${i}`,
        sprintId: "s1",
        storyPoints: 1,
        boardColumn: "backlog",
        sprintAddedAt: "2025-01-06T10:00:00.000Z"
      })
    );
  }
  stories.push(
    story({
      id: "n1",
      sprintId: "s1",
      storyPoints: 2,
      boardColumn: "backlog",
      sprintAddedAt: "2025-01-10T10:00:00.000Z"
    }),
    story({
      id: "n2",
      sprintId: "s1",
      storyPoints: 2,
      boardColumn: "backlog",
      sprintAddedAt: "2025-01-11T10:00:00.000Z"
    })
  );
  const r = scoreScopeStability(stories, "2025-01-06");
  assert.equal(r.score, 12);
});

test("scopeStability: 4 added, 10 original → 0 pts (40% creep)", () => {
  const stories: Story[] = [];
  for (let i = 0; i < 10; i++) {
    stories.push(
      story({
        id: `o${i}`,
        sprintId: "s1",
        storyPoints: 1,
        boardColumn: "backlog",
        sprintAddedAt: "2025-01-06T10:00:00.000Z"
      })
    );
  }
  for (let j = 0; j < 4; j++) {
    stories.push(
      story({
        id: `n${j}`,
        sprintId: "s1",
        storyPoints: 1,
        boardColumn: "backlog",
        sprintAddedAt: "2025-01-15T10:00:00.000Z"
      })
    );
  }
  const r = scoreScopeStability(stories, "2025-01-06");
  assert.equal(r.score, 0);
});

test("grade thresholds", () => {
  assert.equal(gradeFromTotal(95), "A");
  assert.equal(gradeFromTotal(85), "B");
  assert.equal(gradeFromTotal(55), "F");
});

test("calculateHealthScore: perfect inputs → 100, A", () => {
  const stories: Story[] = [
    story({
      id: "1",
      sprintId: "s1",
      storyPoints: 5,
      boardColumn: "done",
      sprintAddedAt: "2025-01-06T10:00:00.000Z"
    })
  ];
  const retro: Retro = {
    id: "r1",
    sprintId: "s1",
    title: "R",
    template: "start_stop_continue",
    phase: "reflect",
    isAnonymous: false
  };
  const items: RetroActionItem[] = [
    {
      id: "a1",
      retroId: "r1",
      sprintId: "s1",
      description: "x",
      ownerId: null,
      status: "open",
      carriedOverFromId: null
    }
  ];
  const res = calculateHealthScore({
    asOfDateYmd: "2025-01-17",
    snapshots: [] as SprintDaySnapshot[],
    sprint: {
      ...baseSprint,
      capacityTarget: 5,
      capacitySnapshot: { teamAvailabilityRatio: 0.96 }
    },
    stories,
    retro,
    retroCardCount: 3,
    actionItems: items,
    previousRetrosActionItems: [
      {
        id: "p1",
        retroId: "rx",
        sprintId: "sx",
        description: "p",
        ownerId: null,
        status: "complete",
        carriedOverFromId: null
      },
      {
        id: "p2",
        retroId: "rx",
        sprintId: "sx",
        description: "p2",
        ownerId: null,
        status: "open",
        carriedOverFromId: null
      }
    ],
    previousSprintHealthTotal: null,
    liveTeamAvailabilityRatio: 0.96
  });
  assert.equal(res.grade, "A");
  assert.equal(res.total, 100);
});

test("calculateHealthScore: all zeros / empty → low score, F", () => {
  const res = calculateHealthScore({
    asOfDateYmd: "2025-01-17",
    snapshots: [],
    sprint: {
      id: "s1",
      startDate: "2025-01-06",
      endDate: "2025-01-17",
      capacityTarget: null,
      capacitySnapshot: null
    },
    stories: [],
    retro: null,
    retroCardCount: 0,
    actionItems: [],
    previousRetrosActionItems: [],
    previousSprintHealthTotal: null,
    liveTeamAvailabilityRatio: null
  });
  assert.equal(res.grade, "F");
  assert.ok(res.total < 60);
});

test("calculateHealthScore: no retro → retroHealth reflects", () => {
  const res = calculateHealthScore({
    asOfDateYmd: "2025-01-17",
    snapshots: [],
    sprint: baseSprint,
    stories: [
      story({
        id: "1",
        sprintId: "s1",
        storyPoints: 5,
        boardColumn: "done",
        sprintAddedAt: "2025-01-06T10:00:00.000Z"
      })
    ],
    retro: null,
    retroCardCount: 0,
    actionItems: [],
    previousRetrosActionItems: [],
    previousSprintHealthTotal: null,
    liveTeamAvailabilityRatio: 0.9
  });
  assert.ok(res.components.retroHealth.score < 20);
});

test("capacityAlignment: overUnder in band → 20", () => {
  const r = scoreCapacityAlignment(50, 50);
  assert.equal(r.score, 20);
});
