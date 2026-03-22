// Developed by Sydney Edwards
import { randomUUID } from "node:crypto";

export function createMember(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? "Test Member",
    roleType: overrides.roleType ?? "team_member",
    coordinatorTitle: overrides.coordinatorTitle ?? "",
    avatar: overrides.avatar ?? { color: "#336699", initials: "TM" },
    defaultAvailabilityDays: overrides.defaultAvailabilityDays ?? 10,
    capacityMultiplier: overrides.capacityMultiplier ?? 100,
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    coordinatorTeamIds: overrides.coordinatorTeamIds ?? [],
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    ...overrides
  };
}

export function createSprint(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? "Sprint 1",
    startDate: overrides.startDate ?? "2025-01-06",
    endDate: overrides.endDate ?? "2025-01-17",
    goal: overrides.goal ?? "",
    status: overrides.status ?? "planning",
    completedAt: overrides.completedAt ?? null,
    velocityDataPoint: overrides.velocityDataPoint ?? null,
    capacityTarget: overrides.capacityTarget ?? null,
    capacitySnapshot: overrides.capacitySnapshot ?? null,
    ...overrides
  };
}

export function createStory(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    sprintId: overrides.sprintId ?? "sprint-1",
    title: overrides.title ?? "Story",
    description: overrides.description ?? "",
    storyPoints: overrides.storyPoints ?? 5,
    assigneeMemberId: overrides.assigneeMemberId ?? null,
    labels: overrides.labels ?? [],
    acceptanceCriteria: overrides.acceptanceCriteria ?? [],
    boardColumn: overrides.boardColumn ?? "backlog",
    ...overrides
  };
}

export function createRetro(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    sprintId: overrides.sprintId ?? "sprint-1",
    title: overrides.title ?? "Retro",
    template: overrides.template ?? "start_stop_continue",
    phase: overrides.phase ?? "reflect",
    isAnonymous: overrides.isAnonymous !== undefined ? overrides.isAnonymous : false,
    ...overrides
  };
}

export function createCard(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    retroId: overrides.retroId ?? "retro-1",
    columnKey: overrides.columnKey ?? "start",
    content: overrides.content ?? "Card text",
    authorId: overrides.authorId ?? "member-1",
    upvotes: overrides.upvotes ?? [],
    groupId: overrides.groupId !== undefined ? overrides.groupId : null,
    ...overrides
  };
}

export function createActionItem(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    retroId: overrides.retroId ?? "retro-1",
    description: overrides.description ?? "Do something",
    ownerId: overrides.ownerId ?? null,
    dueDate: overrides.dueDate ?? null,
    status: overrides.status ?? "open",
    carriedOverFromId: overrides.carriedOverFromId ?? null,
    sprintId: overrides.sprintId ?? "sprint-1",
    ...overrides
  };
}
