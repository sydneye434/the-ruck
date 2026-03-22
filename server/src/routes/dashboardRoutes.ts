// Developed by Sydney Edwards
import { Router } from "express";
import path from "node:path";
import type { RetroActionItem, Sprint } from "@the-ruck/shared";
import { calculateEffectiveDays } from "@the-ruck/shared";
import {
  activityLogRepository,
  retroCardsRepository,
  retroActionItemsRepository,
  retrosRepository,
  sprintsRepository,
  storiesRepository,
  teamMembersRepository
} from "../repositories";
import { sendSuccess } from "../utils/envelope";
import { asyncHandler } from "../utils/asyncHandler";
import { buildHealthPayloadForSprintId } from "../services/sprintHealthService";

export const dashboardRoutes = Router();

type VelocityTrendRow = {
  id: string;
  name: string;
  completedAt?: string;
  velocityDataPoint: number;
  capacityTarget: number | null;
};

const dashboardUtils = require(path.resolve(__dirname, "../utils/dashboardUtils.js")) as {
  calculateDaysRemaining: (endDate: string) => number;
  calculateProgressPercent: (completed: number, total: number) => number;
  buildVelocityTrend: (completedSprints: Sprint[], limit?: number) => VelocityTrendRow[];
  getOverdueActionItems: (items: RetroActionItem[]) => RetroActionItem[];
};

dashboardRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
  const [sprints, stories, teamMembers, retros, actionItems, activityLogs] = await Promise.all([
    sprintsRepository.getAll(),
    storiesRepository.getAll(),
    teamMembersRepository.getAll(),
    retrosRepository.getAll(),
    retroActionItemsRepository.getAll(),
    activityLogRepository.getAll()
  ]);
  const retroCards = await retroCardsRepository.getAll();

  const activeSprint = sprints.find((s) => s.status === "active") ?? null;

  let activeSprintData = null as null | {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    isOverdue: boolean;
    capacityTarget: number | null;
    totalPoints: number;
    completedPoints: number;
    progressPercent: number;
    capacityUsedPercent: number | null;
    storiesByColumn: {
      backlog: number;
      in_progress: number;
      in_review: number;
      done: number;
    };
    healthScore: { total: number; grade: string; trend: string } | null;
  };

  if (activeSprint) {
    const sprintStories = stories.filter((story) => story.sprintId === activeSprint.id);
    const totalPoints = sprintStories.reduce((sum, story) => sum + (story.storyPoints ?? 0), 0);
    const completedPoints = sprintStories
      .filter((story) => story.boardColumn === "done")
      .reduce((sum, story) => sum + (story.storyPoints ?? 0), 0);
    const storiesByColumn = {
      backlog: sprintStories.filter((s) => s.boardColumn === "backlog").length,
      in_progress: sprintStories.filter((s) => s.boardColumn === "in_progress").length,
      in_review: sprintStories.filter((s) => s.boardColumn === "in_review").length,
      done: sprintStories.filter((s) => s.boardColumn === "done").length
    };
    const daysRemaining = dashboardUtils.calculateDaysRemaining(activeSprint.endDate);
    const capacityTarget = activeSprint.capacityTarget ?? null;

    const healthPayload = await buildHealthPayloadForSprintId(activeSprint.id);
    const healthScore = healthPayload
      ? {
          total: healthPayload.healthScore.total,
          grade: healthPayload.healthScore.grade,
          trend: healthPayload.healthScore.trend
        }
      : null;

    activeSprintData = {
      id: activeSprint.id,
      name: activeSprint.name,
      goal: activeSprint.goal,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      capacityTarget,
      totalPoints,
      completedPoints,
      progressPercent: dashboardUtils.calculateProgressPercent(completedPoints, totalPoints),
      capacityUsedPercent:
        typeof capacityTarget === "number" && capacityTarget > 0
          ? dashboardUtils.calculateProgressPercent(completedPoints, capacityTarget)
          : null,
      storiesByColumn,
      healthScore
    };
  }

  const velocityTrend = dashboardUtils.buildVelocityTrend(
    sprints.filter((s) => s.status === "completed"),
    5
  );

  const activeMembers = teamMembers.filter((member) => member.isActive);
  const averageCapacityPercent =
    activeMembers.length > 0
      ? Math.round(
          activeMembers.reduce((sum, member) => sum + (member.capacityMultiplier ?? 100), 0) /
            activeMembers.length
        )
      : 0;
  const membersAtReducedCapacity = activeMembers
    .filter((member) => (member.capacityMultiplier ?? 100) < 100)
    .map((member) => ({
      id: member.id,
      name: member.name,
      capacityMultiplier: member.capacityMultiplier ?? 100,
      effectiveDays: calculateEffectiveDays(
        member.defaultAvailabilityDays,
        member.capacityMultiplier ?? 100
      )
    }));

  const activeSprintRetro = activeSprint
    ? retros.find((retro) => retro.sprintId === activeSprint.id) ?? null
    : null;
  const activeSprintRetroSummary = activeSprintRetro
    ? {
        id: activeSprintRetro.id,
        phase: activeSprintRetro.phase,
        cardCount: retroCards.filter((card) => card.retroId === activeSprintRetro.id).length,
        openActionItemCount: actionItems.filter(
          (item) =>
            item.retroId === activeSprintRetro.id &&
            (item.status === "open" || item.status === "in_progress")
        ).length
      }
    : null;

  const overdueActionItems = dashboardUtils.getOverdueActionItems(actionItems).map((item: any) => {
    const owner = teamMembers.find((member) => member.id === item.ownerId);
    const retro = retros.find((r) => r.id === item.retroId);
    const sprint = retro ? sprints.find((s) => s.id === retro.sprintId) : null;
    return {
      id: item.id,
      description: item.description,
      ownerId: item.ownerId,
      ownerName: owner?.name ?? null,
      dueDate: item.dueDate,
      retroId: item.retroId,
      sprintName: sprint?.name ?? "Unknown Sprint"
    };
  });

  const recentActivity = [...activityLogs]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 10)
    .map((entry) => ({
      type: entry.type,
      description: entry.description,
      timestamp: entry.createdAt,
      actorName: teamMembers.find((member) => member.id === entry.actorId)?.name ?? null
    }));

  return sendSuccess(res, {
    activeSprint: activeSprintData,
    velocityTrend,
    teamSummary: {
      totalMembers: teamMembers.length,
      activeMembers: activeMembers.length,
      averageCapacityPercent,
      membersAtReducedCapacity
    },
    retroSummary: {
      activeSprintRetro: activeSprintRetroSummary,
      totalOpenActionItems: actionItems.filter((i) => i.status !== "complete").length,
      overdueActionItems
    },
    recentActivity
  });
  })
);
