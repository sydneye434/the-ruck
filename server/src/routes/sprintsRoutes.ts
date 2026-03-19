import { Router } from "express";
import type { Sprint } from "@the-ruck/shared";
import { sprintsRepository, storiesRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";

export const sprintsRoutes = Router();

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
    ...(patch?.status !== undefined ? { status: patch.status } : {})
  });

  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendSuccess(res, updated);
});

sprintsRoutes.delete("/:id", async (req, res) => {
  const deleted = await sprintsRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Sprint not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
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

  return sendSuccess(res, updated, { velocityDataPoint, doneStoryCount: doneStories.length });
});

