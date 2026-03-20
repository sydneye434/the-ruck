// Developed by Sydney Edwards
import { Router } from "express";
import path from "node:path";
import { calculateEffectiveDays, withComputedDepth, type Sprint } from "@the-ruck/shared";
import { sprintsRepository, storiesRepository, teamMemberLinksRepository, teamMembersRepository, teamsRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { logActivity } from "../utils/activityLogger";

export const sprintsRoutes = Router();

const sharedPackageJsonPath = require.resolve("@the-ruck/shared/package.json");
const sharedWorkspaceRoot = path.dirname(sharedPackageJsonPath);

const workingDays = require(path.join(sharedWorkspaceRoot, "workingDays.js")) as {
  countWorkingDaysInRange: (startDate: string, endDate: string) => number;
};

sprintsRoutes.get("/", async (_req, res) => {
  const data = await sprintsRepository.getAll();
  return sendSuccess(res, data);
});

sprintsRoutes.post("/", async (req, res) => {
  const input = req.body as any;
  if (!input?.name || !input?.startDate || !input?.endDate) {
    throw new HttpError({ statusCode: 400, code: "INVALID_REQUEST", message: "Missing required sprint fields" });
  }

  // Default to "planning" unless explicitly provided.
  const status: Sprint["status"] = input.status ?? "planning";

  const created = await sprintsRepository.create({
    name: String(input.name),
    startDate: String(input.startDate),
    endDate: String(input.endDate),
    goal: String(input.goal ?? ""),
    status
  });

  return sendSuccess(res, created, { location: `/api/sprints/${created.id}` });
});

sprintsRoutes.get("/:id", async (req, res) => {
  const sprint = await sprintsRepository.getById(req.params.id);
  if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendSuccess(res, sprint);
});

sprintsRoutes.patch("/:id", async (req, res) => {
  const patch = req.body as any;
  const updated = await sprintsRepository.update(req.params.id, {
    ...(patch?.name !== undefined ? { name: String(patch.name) } : {}),
    ...(patch?.startDate !== undefined ? { startDate: String(patch.startDate) } : {}),
    ...(patch?.endDate !== undefined ? { endDate: String(patch.endDate) } : {}),
    ...(patch?.goal !== undefined ? { goal: String(patch.goal) } : {}),
    ...(patch?.status !== undefined ? { status: patch.status } : {}),
    ...(patch?.capacityTarget !== undefined ? { capacityTarget: Number(patch.capacityTarget) } : {}),
    ...(patch?.capacitySnapshot !== undefined ? { capacitySnapshot: patch.capacitySnapshot } : {})
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendSuccess(res, updated);
});

sprintsRoutes.delete("/:id", async (req, res) => {
  const deleted = await sprintsRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
});

sprintsRoutes.get("/:id/capacity-context", async (req, res) => {
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
      capacityTarget: (sprint as any).capacityTarget ?? null,
      capacitySnapshot: (sprint as any).capacitySnapshot ?? null
    },
    completedSprints,
    activeMembers,
    teams: withComputedDepth(teams),
    memberships,
    workingDaysInSprint
  });
});

// Triggers velocity calculation and marks the sprint as completed.
sprintsRoutes.post("/:id/complete", async (req, res) => {
  const sprint = await sprintsRepository.getById(req.params.id);
  if (!sprint) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });

  const allStories = await storiesRepository.getAll();
  const doneStories = allStories.filter(
    (s) => s.sprintId === req.params.id && s.boardColumn === "done"
  );

  const velocityDataPoint = doneStories.reduce((sum, s) => sum + s.storyPoints, 0);

  const updated = await sprintsRepository.update(req.params.id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    velocityDataPoint
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

  return sendSuccess(res, updated, { velocityDataPoint, doneStoryCount: doneStories.length });
});

