// Developed by Sydney Edwards
import { Router } from "express";
import type { Story, StoryBoardColumn, StoryPoints } from "@the-ruck/shared";
import { sprintsRepository, storiesRepository } from "../repositories";
import { HttpError } from "../utils/httpError";
import { sendEmptySuccess, sendSuccess } from "../utils/envelope";
import { logActivity } from "../utils/activityLogger";
import { asyncHandler } from "../utils/asyncHandler";
import { recordBurndownSnapshotForSprint, shouldRecordForStoryMove } from "../services/burndownSnapshotService";
import { getJsonBody } from "../utils/jsonBody";

export const storiesRoutes = Router();

const VALID_POINTS = new Set([1, 2, 3, 5, 8, 13]);
const VALID_COLUMNS = new Set<StoryBoardColumn>(["backlog", "in_progress", "in_review", "done"]);

async function getActiveSprintId(): Promise<string | null> {
  const sprints = await sprintsRepository.getAll();
  const active = sprints.find((s) => s.status === "active");
  return active?.id ?? null;
}

function asStoryPoints(v: unknown): StoryPoints | null {
  return typeof v === "number" && VALID_POINTS.has(v as number) ? (v as StoryPoints) : null;
}

function asBoardColumn(v: unknown): StoryBoardColumn | null {
  return typeof v === "string" && VALID_COLUMNS.has(v as StoryBoardColumn)
    ? (v as StoryBoardColumn)
    : null;
}

// Query-aware list:
// - GET /api/stories?sprintId=:id -> stories for that sprint
// - GET /api/stories?sprintId=backlog -> unassigned backlog stories
storiesRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await storiesRepository.getAll();
    const sprintId = req.query.sprintId;

    if (typeof sprintId !== "string" || !sprintId) {
      return sendSuccess(res, data);
    }

    if (sprintId === "backlog") {
      // Backlog stories are those sitting in the Backlog column (unassigned until pulled).
      const backlogStories = data.filter((s) => s.boardColumn === "backlog");
      return sendSuccess(res, backlogStories);
    }

    const scoped = data.filter((s) => s.sprintId === sprintId);
    return sendSuccess(res, scoped);
  })
);

storiesRoutes.post(
  "/",
  asyncHandler(async (req, res) => {
  const input = getJsonBody(req);

  const storyPoints = asStoryPoints(input.storyPoints);
  const boardColumn = asBoardColumn(input.boardColumn);

  if (input.sprintId == null || input.title == null || !storyPoints || !boardColumn) {
    throw new HttpError({
      statusCode: 400,
      code: "INVALID_REQUEST",
      message: "Missing required story fields"
    });
  }

  const activeId = await getActiveSprintId();
  const sprintAddedAt =
    activeId != null && String(input.sprintId) === activeId ? new Date().toISOString() : undefined;

  const created = await storiesRepository.create({
    sprintId: String(input.sprintId),
    title: String(input.title),
    description: String(input.description ?? ""),
    storyPoints,
    assigneeMemberId: input.assigneeMemberId ? String(input.assigneeMemberId) : null,
    labels: Array.isArray(input.labels) ? input.labels.map((x: unknown) => String(x)) : [],
    acceptanceCriteria: Array.isArray(input.acceptanceCriteria)
      ? input.acceptanceCriteria.map((x: unknown) => String(x))
      : [],
    boardColumn,
    ...(sprintAddedAt ? { sprintAddedAt } : {})
  });

  const sprint = await sprintsRepository.getById(created.sprintId);
  logActivity({
    type: "story_created",
    description: `Story '${created.title}' added to ${sprint?.name ?? "Backlog"}`,
    actorId: created.assigneeMemberId ?? null,
    metadata: { storyId: created.id, sprintId: created.sprintId }
  });

  return sendSuccess(res, created, { location: `/api/stories/${created.id}` }, 201);
  })
);

storiesRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
  const story = await storiesRepository.getById(req.params.id);
  if (!story) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Story not found" });
  return sendSuccess(res, story);
  })
);

storiesRoutes.patch(
  "/:id",
  asyncHandler(async (req, res) => {
  const patch = getJsonBody(req);
  const existing = await storiesRepository.getById(req.params.id);
  if (!existing) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Story not found" });

  const activeId = await getActiveSprintId();
  const nextSprintId =
    patch.sprintId !== undefined ? String(patch.sprintId) : existing.sprintId;
  const sprintChanged =
    patch.sprintId !== undefined && String(patch.sprintId) !== existing.sprintId;
  const sprintAddedAt =
    sprintChanged && activeId != null && nextSprintId === activeId
      ? new Date().toISOString()
      : sprintChanged
        ? null
        : undefined;

  const updatePatch: Partial<Omit<Story, "id">> = {
    ...(patch.sprintId !== undefined ? { sprintId: String(patch.sprintId) } : {}),
    ...(patch.title !== undefined ? { title: String(patch.title) } : {}),
    ...(patch.description !== undefined ? { description: String(patch.description) } : {}),
    ...(patch.storyPoints !== undefined && asStoryPoints(patch.storyPoints) !== null
      ? { storyPoints: asStoryPoints(patch.storyPoints)! }
      : {}),
    ...(patch.assigneeMemberId !== undefined
      ? { assigneeMemberId: patch.assigneeMemberId ? String(patch.assigneeMemberId) : null }
      : {}),
    ...(patch.labels !== undefined
      ? { labels: Array.isArray(patch.labels) ? patch.labels.map((x: unknown) => String(x)) : [] }
      : {}),
    ...(patch.acceptanceCriteria !== undefined
      ? {
          acceptanceCriteria: Array.isArray(patch.acceptanceCriteria)
            ? patch.acceptanceCriteria.map((x: unknown) => String(x))
            : []
        }
      : {}),
    ...(patch.boardColumn !== undefined && asBoardColumn(patch.boardColumn) !== null
      ? { boardColumn: asBoardColumn(patch.boardColumn)! }
      : {}),
    ...(sprintAddedAt !== undefined ? { sprintAddedAt } : {})
  };

  const updated = await storiesRepository.update(req.params.id, updatePatch);
  if (!updated) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Story not found" });
  if (updatePatch.boardColumn && updatePatch.boardColumn !== existing.boardColumn) {
    logActivity({
      type: "story_moved",
      description: `Story '${updated.title}' moved to ${updatePatch.boardColumn}`,
      actorId: updated.assigneeMemberId ?? null,
      metadata: { storyId: updated.id, sprintId: updated.sprintId, boardColumn: updatePatch.boardColumn }
    });
  }
  if (shouldRecordForStoryMove(existing, updated.boardColumn)) {
    recordBurndownSnapshotForSprint(updated.sprintId);
  }
  return sendSuccess(res, updated);
  })
);

storiesRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
  const deleted = await storiesRepository.delete(req.params.id);
  if (!deleted) throw new HttpError({ statusCode: 404, code: "NOT_FOUND", message: "Story not found" });
  return sendEmptySuccess(res, { deletedId: req.params.id });
  })
);

