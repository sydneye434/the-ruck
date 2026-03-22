// Developed by Sydney Edwards
import { Router } from "express";
import path from "node:path";
import {
  calculateEffectiveDays,
  calculateIdealBurndown,
  calculateProjectedCompletion,
  withComputedDepth,
  type Sprint
} from "@the-ruck/shared";
import {
  sprintDaySnapshotRepository,
  sprintsRepository,
  storiesRepository,
  teamMemberLinksRepository,
  teamMembersRepository,
  teamsRepository
} from "../repositories";
import {
  recordBurndownSnapshotForSprint,
  shouldRecordForSprintActivation
} from "../services/burndownSnapshotService";
import { buildHealthPayloadForSprintId, toStoredFinalHealth } from "../services/sprintHealthService";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { logActivity } from "../utils/activityLogger";
import { asyncHandler } from "../utils/asyncHandler";
import { getJsonBody } from "../utils/jsonBody";

export const sprintsRoutes = Router();

const sharedPackageJsonPath = require.resolve("@the-ruck/shared/package.json");
const sharedWorkspaceRoot = path.dirname(sharedPackageJsonPath);

const workingDays = require(path.join(sharedWorkspaceRoot, "workingDays.js")) as {
  countWorkingDaysInRange: (startDate: string, endDate: string) => number;
};

sprintsRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await sprintsRepository.getAll();
    return sendSuccess(res, data);
  })
);

sprintsRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
  const input = getJsonBody(req);
  if (input.name == null || input.startDate == null || input.endDate == null) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required sprint fields" });
  }

  const startMs = new Date(String(input.startDate)).getTime();
  const endMs = new Date(String(input.endDate)).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "endDate must be after startDate"
    });
  }

  // Default to "planning" unless explicitly provided.
  const rawStatus = input.status;
  const status: Sprint["status"] =
    rawStatus === "planning" || rawStatus === "active" || rawStatus === "completed"
      ? rawStatus
      : "planning";

  const created = await sprintsRepository.create({
    name: String(input.name),
    startDate: String(input.startDate),
    endDate: String(input.endDate),
    goal: String(input.goal ?? ""),
    status
  });

  if (created.status === "active") {
    recordBurndownSnapshotForSprint(created.id);
  }

  return sendSuccess(res, created, { location: `/api/sprints/${created.id}` }, 201);
  })
);

sprintsRoutes.get(
  "/:id/burndown",
  asyncHandler(async (req, res) => {
    const sprint = await sprintsRepository.getById(req.params.id);
    if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

    const allStories = await storiesRepository.getAll();
    const sprintStories = allStories.filter((s) => s.sprintId === sprint.id);
    const totalPoints = sprintStories.reduce((sum, s) => sum + s.storyPoints, 0);

    const snapshots = await sprintDaySnapshotRepository.findBySprintId(sprint.id);
    const idealBurndown = calculateIdealBurndown(sprint, totalPoints);
    const projectedCompletion = calculateProjectedCompletion(snapshots, sprint);

    const last = snapshots[snapshots.length - 1];
    const projectedLine =
      projectedCompletion.date && last
        ? [
            { date: last.date, remainingPoints: last.remainingPoints },
            { date: projectedCompletion.date, remainingPoints: 0 }
          ]
        : [];

    return sendSuccess(res, {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        capacityTarget: sprint.capacityTarget ?? null
      },
      snapshots,
      idealBurndown,
      projectedCompletion,
      projectedLine
    });
  })
);

sprintsRoutes.get(
  "/:id/health",
  asyncHandler(async (req, res) => {
    const payload = await buildHealthPayloadForSprintId(req.params.id);
    if (!payload) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
    return sendSuccess(res, {
      healthScore: payload.healthScore,
      calculatedAt: payload.calculatedAt,
      history: payload.history
    });
  })
);

sprintsRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
  const sprint = await sprintsRepository.getById(req.params.id);
  if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendSuccess(res, sprint);
  })
);

sprintsRoutes.patch(
  "/:id",
  asyncHandler(async (req, res) => {
  const patch = getJsonBody(req);
  const existing = await sprintsRepository.getById(req.params.id);
  if (!existing) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

  const updated = await sprintsRepository.update(req.params.id, {
    ...(patch.name !== undefined ? { name: String(patch.name) } : {}),
    ...(patch.startDate !== undefined ? { startDate: String(patch.startDate) } : {}),
    ...(patch.endDate !== undefined ? { endDate: String(patch.endDate) } : {}),
    ...(patch.goal !== undefined ? { goal: String(patch.goal) } : {}),
    ...(patch.status !== undefined ? { status: patch.status as Sprint["status"] } : {}),
    ...(patch.capacityTarget !== undefined ? { capacityTarget: Number(patch.capacityTarget) } : {}),
    ...(patch.capacitySnapshot !== undefined ? { capacitySnapshot: patch.capacitySnapshot } : {})
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

  if (shouldRecordForSprintActivation(existing, { status: patch.status as Sprint["status"] | undefined })) {
    recordBurndownSnapshotForSprint(updated.id);
  }

  return sendSuccess(res, updated);
  })
);

sprintsRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
  const deleted = await sprintsRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
  })
);

sprintsRoutes.get(
  "/:id/capacity-context",
  asyncHandler(async (req, res) => {
  const sprint = await sprintsRepository.getById(req.params.id);
  if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

  const allSprints = await sprintsRepository.getAll();
  const completedSprints = allSprints
    .filter((s) => s.status === "completed")
    .map((s) => ({
      id: s.id,
      name: s.name,
      completedAt: s.completedAt,
      velocityDataPoint: s.velocityDataPoint ?? 0
    }));

  const members = await teamMembersRepository.getAll();
  const [teams, memberships] = await Promise.all([
    teamsRepository.getAll(),
    teamMemberLinksRepository.getAll()
  ]);
  const activeMembers = members
    .filter((m) => m.isActive)
    .map((m) => ({
      ...m,
      effectiveDays: calculateEffectiveDays(
        m.defaultAvailabilityDays,
        m.capacityMultiplier ?? 100
      )
    }));

  const workingDaysInSprint = workingDays.countWorkingDaysInRange(
    sprint.startDate,
    sprint.endDate
  );

  return sendSuccess(res, {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      capacityTarget: sprint.capacityTarget ?? null,
      capacitySnapshot: sprint.capacitySnapshot ?? null
    },
    completedSprints,
    activeMembers,
    teams: withComputedDepth(teams),
    memberships,
    workingDaysInSprint
  });
  })
);

// Triggers velocity calculation and marks the sprint as completed.
sprintsRoutes.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
  const sprint = await sprintsRepository.getById(req.params.id);
  if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

  if (sprint.status === "completed") {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Sprint is already completed"
    });
  }

  const allStories = await storiesRepository.getAll();
  const doneStories = allStories.filter(
    (s) => s.sprintId === req.params.id && s.boardColumn === "done"
  );

  const velocityDataPoint = doneStories.reduce((sum, s) => sum + s.storyPoints, 0);

  const healthPayload = await buildHealthPayloadForSprintId(req.params.id, {
    asOfDateYmd: sprint.endDate.slice(0, 10)
  });
  const finalHealthScore = healthPayload ? toStoredFinalHealth(healthPayload.healthScore) : undefined;

  const updated = await sprintsRepository.update(req.params.id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    velocityDataPoint,
    ...(finalHealthScore ? { finalHealthScore } : {})
  });

  if (!updated) {
    throw new HttpError({ statusCode: 500, code: "INTERNAL_ERROR", message: "Failed to complete sprint" });
  }

  logActivity({
    type: "sprint_completed",
    description: `Sprint '${updated.name}' completed with ${velocityDataPoint} points`,
    actorId: null,
    metadata: { sprintId: updated.id, velocityDataPoint }
  });

  recordBurndownSnapshotForSprint(updated.id);

  return sendSuccess(res, updated, { velocityDataPoint, doneStoryCount: doneStories.length });
  })
);

